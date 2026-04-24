import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import { Document, Outline, Page, pdfjs } from "react-pdf";
import { BookOpen, Expand, Minimize, Trash2, Upload } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import {
  getPdfBookmarks,
  getPdfBooks,
  getPdfQuotes,
  savePdfBookmarks,
  savePdfQuotes,
  STORAGE_HYDRATED_EVENT,
  type PdfBookRecord,
  type PdfBookmark,
  type PdfQuote,
  upsertPdfBook,
} from "../lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const PDF_BUCKET = "mindful-pdf";
const MAX_ACTIVE_BOOKS = 2;

function nowIso() {
  return new Date().toISOString();
}

function percent(book: PdfBookRecord): number {
  if (!book.totalPages) return 0;
  return Math.min(100, Math.round((book.currentPage / book.totalPages) * 100));
}

export function PdfReader() {
  const { user } = useAuth();
  const readerPaneRef = useRef<HTMLDivElement | null>(null);
  const [books, setBooks] = useState<PdfBookRecord[]>([]);
  const [bookmarks, setBookmarks] = useState<PdfBookmark[]>([]);
  const [quotes, setQuotes] = useState<PdfQuote[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [bookmarkNote, setBookmarkNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renderWidth, setRenderWidth] = useState<number>(820);

  const activeBook = useMemo(
    () => books.find((b) => b.id === activeBookId) ?? null,
    [activeBookId, books]
  );
  const activeBookmarks = useMemo(
    () => bookmarks.filter((x) => x.bookId === activeBookId),
    [bookmarks, activeBookId]
  );
  const activeQuotes = useMemo(
    () => quotes.filter((x) => x.bookId === activeBookId),
    [quotes, activeBookId]
  );

  function refresh() {
    const nextBooks = getPdfBooks().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    setBooks(nextBooks);
    setBookmarks(getPdfBookmarks());
    setQuotes(getPdfQuotes());
    if (!nextBooks.length) {
      setActiveBookId(null);
      return;
    }
    if (!activeBookId || !nextBooks.some((x) => x.id === activeBookId)) {
      setActiveBookId(nextBooks[0].id);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const onHydrated = () => refresh();
    window.addEventListener(STORAGE_HYDRATED_EVENT, onHydrated);
    return () => window.removeEventListener(STORAGE_HYDRATED_EVENT, onHydrated);
  }, []);

  useEffect(() => {
    if (!activeBook?.storagePath || activeBook.completedAt) {
      setPdfUrl(null);
      return;
    }
    const { data } = supabase.storage.from(PDF_BUCKET).getPublicUrl(activeBook.storagePath);
    setPdfUrl(data.publicUrl);
  }, [activeBook?.id, activeBook?.storagePath, activeBook?.completedAt]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const fs = document.fullscreenElement === readerPaneRef.current;
      setIsFullscreen(fs);
      const available = fs ? window.innerWidth - 120 : 820;
      setRenderWidth(Math.max(420, Math.floor(available)));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  async function uploadPdf(file: File) {
    if (!user) {
      toast.error("请先登录");
      return;
    }
    const activeCount = books.filter((b) => !b.completedAt).length;
    if (activeCount >= MAX_ACTIVE_BOOKS) {
      toast.error("最多仅保留 2 本未读 PDF，请先读完一本。");
      return;
    }
    setBusy(true);
    try {
      const id = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${user.id}/${id}-${safeName}`;
      const upload = await supabase.storage.from(PDF_BUCKET).upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upload.error) throw upload.error;

      const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() });
      const doc = await loadingTask.promise;
      const totalPages = doc.numPages;
      const ts = nowIso();
      const record: PdfBookRecord = {
        id,
        title: file.name,
        storagePath,
        totalPages,
        currentPage: 1,
        completedAt: null,
        createdAt: ts,
        updatedAt: ts,
      };
      upsertPdfBook(record);
      setActiveBookId(id);
      refresh();
      toast.success("PDF 上传成功");
    } catch (e: any) {
      console.error(e);
      toast.error(`上传失败: ${e?.message ?? "未知错误"}`);
    } finally {
      setBusy(false);
    }
  }

  async function markCompleteAndCleanup(book: PdfBookRecord) {
    if (book.completedAt) return;
    if (book.storagePath) {
      const removed = await supabase.storage.from(PDF_BUCKET).remove([book.storagePath]);
      if (removed.error) {
        toast.error(`清理失败: ${removed.error.message}`);
        return;
      }
    }
    upsertPdfBook({
      ...book,
      currentPage: book.totalPages,
      completedAt: nowIso(),
      storagePath: null,
      updatedAt: nowIso(),
    });
    refresh();
    toast.success("已读完，PDF 已自动清理，仅保留阅读记录。");
  }

  async function changePage(nextPage: number) {
    if (!activeBook) return;
    const clamped = Math.max(1, Math.min(activeBook.totalPages, nextPage));
    const updated: PdfBookRecord = {
      ...activeBook,
      currentPage: clamped,
      updatedAt: nowIso(),
    };
    upsertPdfBook(updated);
    refresh();
    if (clamped >= activeBook.totalPages) {
      await markCompleteAndCleanup(updated);
    }
  }

  function addBookmark() {
    if (!activeBook) return;
    const entry: PdfBookmark = {
      id: crypto.randomUUID(),
      bookId: activeBook.id,
      page: activeBook.currentPage,
      note: bookmarkNote.trim(),
      createdAt: nowIso(),
    };
    const next = [entry, ...bookmarks];
    savePdfBookmarks(next);
    setBookmarks(next);
    setBookmarkNote("");
  }

  function addQuoteFromSelection() {
    if (!activeBook) return;
    const selected = window.getSelection()?.toString().trim() ?? "";
    if (!selected) {
      toast.error("请先在 PDF 上选中文字");
      return;
    }
    const entry: PdfQuote = {
      id: crypto.randomUUID(),
      bookId: activeBook.id,
      page: activeBook.currentPage,
      text: selected,
      createdAt: nowIso(),
    };
    const next = [entry, ...quotes];
    savePdfQuotes(next);
    setQuotes(next);
    toast.success("已收藏选中文字");
  }

  function removeQuote(id: string) {
    const next = quotes.filter((x) => x.id !== id);
    savePdfQuotes(next);
    setQuotes(next);
  }

  function removeBookmark(id: string) {
    const next = bookmarks.filter((x) => x.id !== id);
    savePdfBookmarks(next);
    setBookmarks(next);
  }

  async function toggleFullscreen() {
    const panel = readerPaneRef.current;
    if (!panel) return;
    if (document.fullscreenElement === panel) {
      await document.exitFullscreen();
      return;
    }
    await panel.requestFullscreen();
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <BookOpen className="size-8 text-emerald-600" />
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">PDF Reader</h1>
          <p className="text-sm text-gray-600">最多保留 2 本未读，读完自动删云端 PDF，仅保留记录。</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>上传 PDF（Supabase Storage）</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Input
            type="file"
            accept="application/pdf"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadPdf(file);
              e.currentTarget.value = "";
            }}
          />
          <p className="text-xs text-gray-500">
            当前未读：{books.filter((b) => !b.completedAt).length}/{MAX_ACTIVE_BOOKS}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>书单与进度</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {books.length === 0 && <p className="text-sm text-gray-500">还没有 PDF。</p>}
            {books.map((book) => {
              const isActive = book.id === activeBookId;
              return (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => setActiveBookId(book.id)}
                  className={`w-full text-left rounded-lg border p-3 transition ${
                    isActive ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-200"
                  }`}
                >
                  <p className="font-medium truncate">{book.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    第 {book.currentPage}/{book.totalPages} 页 · {percent(book)}%
                  </p>
                  <div className="mt-2 h-2 rounded bg-gray-100">
                    <div className="h-full rounded bg-emerald-500" style={{ width: `${percent(book)}%` }} />
                  </div>
                  {book.completedAt && (
                    <p className="text-xs text-emerald-700 mt-1">已完成（文件已清理）</p>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>阅读区</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3" ref={readerPaneRef}>
            {!activeBook && <p className="text-sm text-gray-500">请选择一本 PDF。</p>}
            {activeBook && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void changePage(activeBook.currentPage - 1)}
                    disabled={activeBook.currentPage <= 1 || !!activeBook.completedAt}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void changePage(activeBook.currentPage + 1)}
                    disabled={activeBook.currentPage >= activeBook.totalPages || !!activeBook.completedAt}
                  >
                    下一页
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => void markCompleteAndCleanup(activeBook)}
                    disabled={!!activeBook.completedAt}
                  >
                    标记读完并清理文件
                  </Button>
                  <Button variant="outline" onClick={() => void toggleFullscreen()}>
                    {isFullscreen ? <Minimize className="size-4" /> : <Expand className="size-4" />}
                    {isFullscreen ? "退出全屏" : "全屏阅读"}
                  </Button>
                </div>

                {activeBook.completedAt ? (
                  <p className="text-sm text-gray-600 border rounded p-3">
                    该 PDF 文件已清理，仅保留阅读进度、书签与收藏记录。
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="border rounded-lg p-2 bg-gray-50">
                      {pdfUrl ? (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                          <div className="xl:col-span-4 border rounded p-2 max-h-[72vh] overflow-auto bg-white">
                            <p className="text-xs text-gray-500 mb-2">目录（点击可跳转）</p>
                            <Document file={pdfUrl} loading="目录加载中...">
                              <Outline
                                onItemClick={({ pageNumber }) => {
                                  if (typeof pageNumber === "number") {
                                    void changePage(pageNumber);
                                  }
                                }}
                              />
                            </Document>
                          </div>
                          <div className="xl:col-span-8 overflow-auto max-h-[72vh] border rounded p-2 bg-white">
                            <Document file={pdfUrl} loading="PDF 加载中...">
                              <Page
                                pageNumber={activeBook.currentPage}
                                width={renderWidth}
                                renderAnnotationLayer
                                renderTextLayer
                              />
                            </Document>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">PDF 地址不可用。</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {activeBook && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>书签</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="书签备注（可选）"
                  value={bookmarkNote}
                  onChange={(e) => setBookmarkNote(e.target.value)}
                />
                <Button onClick={addBookmark}>
                  <Upload className="size-4" />
                  添加
                </Button>
              </div>
              <div className="space-y-2">
                {activeBookmarks.map((b) => (
                  <div key={b.id} className="border rounded p-2 text-sm flex items-center gap-2">
                    <button
                      type="button"
                      className="text-emerald-700 hover:underline"
                      onClick={() => void changePage(b.page)}
                    >
                      第 {b.page} 页
                    </button>
                    <span className="text-gray-600 flex-1 truncate">{b.note || "无备注"}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeBookmark(b.id)}>
                      <Trash2 className="size-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                {activeBookmarks.length === 0 && <p className="text-sm text-gray-500">暂无书签。</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>句子收藏（可高亮选择）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={addQuoteFromSelection}>收藏当前选中文字</Button>
              <div className="space-y-2">
                {activeQuotes.map((q) => (
                  <div key={q.id} className="border rounded p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-emerald-700 hover:underline"
                        onClick={() => void changePage(q.page)}
                      >
                        第 {q.page} 页
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto"
                        onClick={() => removeQuote(q.id)}
                      >
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{q.text}</p>
                  </div>
                ))}
                {activeQuotes.length === 0 && <p className="text-sm text-gray-500">暂无句子收藏。</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
