import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent,
  type WheelEvent,
} from "react";
import { toast } from "sonner";
import { Document, Outline, Page, pdfjs } from "react-pdf";
import {
  BookOpen,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Expand,
  List,
  Minimize,
  Trash2,
  X,
} from "lucide-react";
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
import { Slider } from "../components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const PDF_BUCKET = "mindful-pdf";
const MAX_ACTIVE_BOOKS = 2;

const TIPS_STORAGE_KEY = "mindful-pdf-reader-tips-dismissed";

type WorkspaceTab = "library" | "reader" | "annotations";

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
  const pagePaneRef = useRef<HTMLDivElement | null>(null);
  const pageJumpRef = useRef<HTMLInputElement | null>(null);
  const autoPageLockRef = useRef(false);
  const edgeArmRef = useRef<{ top: boolean; bottom: boolean }>({ top: false, bottom: false });
  const [books, setBooks] = useState<PdfBookRecord[]>([]);
  const [bookmarks, setBookmarks] = useState<PdfBookmark[]>([]);
  const [quotes, setQuotes] = useState<PdfQuote[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [bookmarkNote, setBookmarkNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renderWidth, setRenderWidth] = useState<number>(820);
  const [showOutline, setShowOutline] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("library");
  const [pageJumpDraft, setPageJumpDraft] = useState("");
  const [sliderPage, setSliderPage] = useState(1);
  const [showReaderTips, setShowReaderTips] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(TIPS_STORAGE_KEY) !== "1";
  });

  const activeBook = useMemo(
    () => books.find((b) => b.id === activeBookId) ?? null,
    [activeBookId, books]
  );
  const activeBookmarks = useMemo(
    () =>
      bookmarks
        .filter((x) => x.bookId === activeBookId)
        .slice()
        .sort((a, b) => b.page - a.page),
    [bookmarks, activeBookId]
  );
  const activeQuotes = useMemo(
    () =>
      quotes
        .filter((x) => x.bookId === activeBookId)
        .slice()
        .sort((a, b) => b.page - a.page),
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
    if (books.length === 0) setWorkspaceTab("library");
  }, [books.length]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const fs = document.fullscreenElement === readerPaneRef.current;
      setIsFullscreen(fs);
      if (fs) setShowOutline(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const node = pagePaneRef.current;
    if (!node) return;
    const updateWidth = () => {
      const next = Math.max(320, Math.floor(node.clientWidth - 20));
      setRenderWidth(next);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(node);
    window.addEventListener("resize", updateWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, [activeBook?.id, isFullscreen, showOutline]);

  useEffect(() => {
    if (activeBook) {
      setPageJumpDraft(String(activeBook.currentPage));
      setSliderPage(activeBook.currentPage);
    }
  }, [activeBook?.id, activeBook?.currentPage]);

  const dismissReaderTips = useCallback(() => {
    localStorage.setItem(TIPS_STORAGE_KEY, "1");
    setShowReaderTips(false);
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

      const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
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
      setWorkspaceTab("reader");
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

  const commitPageJump = useCallback(() => {
    if (!activeBook) return;
    const raw = pageJumpDraft.trim();
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) {
      setPageJumpDraft(String(activeBook.currentPage));
      toast.error("请输入有效页码");
      return;
    }
    void changePage(n);
  }, [activeBook, pageJumpDraft]);

  const addBookmark = useCallback(() => {
    if (!activeBook || activeBook.completedAt) return;
    const pg = activeBook.currentPage;
    const entry: PdfBookmark = {
      id: crypto.randomUUID(),
      bookId: activeBook.id,
      page: pg,
      note: bookmarkNote.trim(),
      createdAt: nowIso(),
    };
    setBookmarks((prev) => {
      const next = [entry, ...prev];
      savePdfBookmarks(next);
      return next;
    });
    setBookmarkNote("");
    toast.success(`已书签第 ${pg} 页`);
  }, [activeBook, bookmarkNote]);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "b") {
        if (!activeBook || activeBook.completedAt) return;
        e.preventDefault();
        addBookmark();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeBook, addBookmark]);

  function handlePagePaneScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
    const nearTop = el.scrollTop <= 6;
    if (!nearBottom) edgeArmRef.current.bottom = false;
    if (!nearTop) edgeArmRef.current.top = false;
  }

  async function handlePagePaneWheel(event: WheelEvent<HTMLDivElement>) {
    if (!activeBook || activeBook.completedAt || autoPageLockRef.current) return;
    const el = event.currentTarget;
    const hasScrollableContent = el.scrollHeight - el.clientHeight > 12;
    if (!hasScrollableContent) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
    const nearTop = el.scrollTop <= 6;
    const strongDown = event.deltaY > 14;
    const strongUp = event.deltaY < -14;

    if (nearBottom && strongDown && activeBook.currentPage < activeBook.totalPages) {
      if (!edgeArmRef.current.bottom) {
        edgeArmRef.current.bottom = true;
        return;
      }
      autoPageLockRef.current = true;
      edgeArmRef.current.bottom = false;
      await changePage(activeBook.currentPage + 1);
      requestAnimationFrame(() => {
        el.scrollTop = 0;
        window.setTimeout(() => {
          autoPageLockRef.current = false;
        }, 180);
      });
      return;
    }

    if (nearTop && strongUp && activeBook.currentPage > 1) {
      if (!edgeArmRef.current.top) {
        edgeArmRef.current.top = true;
        return;
      }
      autoPageLockRef.current = true;
      edgeArmRef.current.top = false;
      await changePage(activeBook.currentPage - 1);
      requestAnimationFrame(() => {
        el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight - 2);
        window.setTimeout(() => {
          autoPageLockRef.current = false;
        }, 180);
      });
    }
  }

  const canReadPdf = !!(activeBook && !activeBook.completedAt && pdfUrl);
  const sliderMax = activeBook?.totalPages ? Math.max(1, activeBook.totalPages) : 1;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start gap-3">
        <BookOpen className="size-8 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">PDF Reader</h1>
          <p className="text-sm text-muted-foreground">
            最多保留 2 本未读，读完自动删云端 PDF，仅保留记录。
          </p>
        </div>
      </div>

      <Tabs
        value={workspaceTab}
        onValueChange={(v) => setWorkspaceTab(v as WorkspaceTab)}
        className="w-full gap-4"
      >
        <TabsList
          className="w-full grid grid-cols-3 sm:inline-flex sm:w-auto h-auto p-1"
          aria-label="PDF 阅读分区"
        >
          <TabsTrigger value="library" className="min-h-10 px-3">
            书架
          </TabsTrigger>
          <TabsTrigger value="reader" className="min-h-10 px-3">
            阅读
          </TabsTrigger>
          <TabsTrigger value="annotations" className="min-h-10 px-3">
            批注
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-0 space-y-4 focus-visible:outline-none">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">上传 PDF（Supabase Storage）</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 space-y-1">
                <Input
                  type="file"
                  accept="application/pdf"
                  disabled={busy}
                  className="cursor-pointer disabled:opacity-50"
                  aria-label="选择要上传的 PDF 文件"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadPdf(file);
                    e.currentTarget.value = "";
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  当前未读：{books.filter((b) => !b.completedAt).length}/{MAX_ACTIVE_BOOKS}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">书单与进度</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {books.length === 0 && <p className="text-sm text-muted-foreground">还没有 PDF。</p>}
              {books.map((book) => {
                const isActive = book.id === activeBookId;
                return (
                  <button
                    key={book.id}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`打开《${book.title}》，当前 ${book.currentPage}/${book.totalPages} 页`}
                    onClick={() => {
                      setActiveBookId(book.id);
                      if (!book.completedAt) setWorkspaceTab("reader");
                    }}
                    className={`w-full text-left rounded-xl border p-3 transition-colors ${
                      isActive
                        ? "border-emerald-500 bg-emerald-50/80"
                        : "border-border hover:border-emerald-200 hover:bg-muted/40"
                    }`}
                  >
                    <p className="font-medium truncate">{book.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      第 {book.currentPage}/{book.totalPages} 页 · {percent(book)}%
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-[width]"
                        style={{ width: `${percent(book)}%` }}
                      />
                    </div>
                    {book.completedAt && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1.5">
                        已完成（文件已清理）
                      </p>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reader" className="mt-0 focus-visible:outline-none">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">阅读区</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {!activeBook && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  请先在「书架」选择或上传一本 PDF。
                </p>
              )}
              {activeBook && activeBook.completedAt && (
                <p className="text-sm text-muted-foreground border rounded-lg p-4 bg-muted/30">
                  《{activeBook.title}》文件已清理，仅保留阅读进度、书签与摘抄。
                </p>
              )}
              {activeBook && !activeBook.completedAt && (
                <div ref={readerPaneRef} className={`flex flex-col gap-3 ${isFullscreen ? "bg-background p-2 h-[90vh]" : ""}`}>
                  {showReaderTips && canReadPdf && (
                    <aside
                      className="relative rounded-xl border bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800 px-4 py-3 text-sm text-foreground pr-11"
                      role="note"
                    >
                      <p className="font-medium text-emerald-900 dark:text-emerald-100 mb-2">初次使用小技巧</p>
                      <ul className="list-disc pl-5 space-y-1 text-emerald-900/90 dark:text-emerald-100/90">
                        <li>
                          一页较长时：<strong>先滚到页底或页顶</strong>，再继续用力滚轮，可翻到下一页/上一页（第一次顶边会先「卡住」，再滚一次触发）。
                        </li>
                        <li>
                          摘抄：在 PDF 中用鼠标<strong>选中文字</strong>，切到<strong>「批注」</strong>标签点击收藏。
                        </li>
                        <li>
                          快捷键：<kbd className="px-1.5 py-0.5 rounded border bg-background text-xs font-mono">
                            Ctrl/⌘+B
                          </kbd>
                          ：将<strong>当前页</strong>加入书签（可先填书签备注）。
                        </li>
                      </ul>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 shrink-0 h-9 w-9"
                        aria-label="关闭技巧提示并不再显示"
                        onClick={dismissReaderTips}
                      >
                        <X className="size-4" aria-hidden />
                      </Button>
                    </aside>
                  )}

                  <div
                    className="sticky top-0 z-20 -mx-1 px-1 py-2 -mt-1 flex flex-col gap-2 rounded-xl border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 shadow-sm"
                    role="toolbar"
                    aria-label="阅读工具栏"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-11 sm:size-10 shrink-0 touch-manipulation"
                        aria-label="上一页"
                        disabled={activeBook.currentPage <= 1}
                        onClick={() => void changePage(activeBook.currentPage - 1)}
                      >
                        <ChevronLeft className="size-5" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-11 sm:size-10 shrink-0 touch-manipulation"
                        aria-label="下一页"
                        disabled={activeBook.currentPage >= activeBook.totalPages}
                        onClick={() => void changePage(activeBook.currentPage + 1)}
                      >
                        <ChevronRight className="size-5" aria-hidden />
                      </Button>

                      <label className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground whitespace-nowrap">跳转</span>
                        <Input
                          ref={pageJumpRef}
                          type="number"
                          min={1}
                          max={activeBook.totalPages}
                          step={1}
                          className="h-10 w-[4.75rem]"
                          aria-label={`页码，共 ${activeBook.totalPages} 页`}
                          value={pageJumpDraft}
                          onChange={(e) => setPageJumpDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitPageJump();
                          }}
                          onBlur={() => {
                            if (!activeBook) return;
                            const n = parseInt(pageJumpDraft.trim(), 10);
                            if (
                              Number.isFinite(n) &&
                              n !== activeBook.currentPage &&
                              n >= 1 &&
                              n <= activeBook.totalPages
                            ) {
                              void changePage(n);
                              return;
                            }
                            setPageJumpDraft(String(activeBook.currentPage));
                          }}
                        />
                      </label>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 shrink-0"
                        onClick={() => commitPageJump()}
                      >
                        跳转
                      </Button>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        / {activeBook.totalPages}
                      </span>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="touch-manipulation h-10"
                        aria-label={isFullscreen ? "退出全屏阅读" : "全屏阅读"}
                        onClick={() => void toggleFullscreen()}
                      >
                        {isFullscreen ? (
                          <>
                            <Minimize className="size-4 sm:mr-1" aria-hidden />
                            <span className="hidden sm:inline">退出全屏</span>
                          </>
                        ) : (
                          <>
                            <Expand className="size-4 sm:mr-1" aria-hidden />
                            <span className="hidden sm:inline">全屏</span>
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="touch-manipulation h-10"
                        disabled={!pdfUrl}
                        aria-pressed={showOutline}
                        aria-label={showOutline ? "隐藏目录" : "显示目录"}
                        onClick={() => setShowOutline((s) => !s)}
                      >
                        <List className="size-4 sm:mr-1" aria-hidden />
                        <span className="hidden sm:inline">{showOutline ? "隐藏目录" : "目录"}</span>
                      </Button>

                      <Button
                        type="button"
                        className="h-10 bg-emerald-600 hover:bg-emerald-700 touch-manipulation"
                        aria-label="标记读完并删除云端 PDF 文件"
                        onClick={() => void markCompleteAndCleanup(activeBook)}
                      >
                        读完
                      </Button>
                    </div>

                    {activeBook.totalPages > 10 && pdfUrl && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-0.5">
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          快速定位（拖动后松开）</span>
                        <Slider
                          className="flex-1 min-w-[120px] py-1"
                          min={1}
                          max={sliderMax}
                          step={1}
                          aria-label={`页面滑块，1 至 ${sliderMax}`}
                          value={[sliderPage]}
                          onValueChange={(v) => {
                            const p = v[0] ?? 1;
                            setSliderPage(p);
                          }}
                          onValueCommit={(v) => {
                            const p = Math.max(
                              1,
                              Math.min(sliderMax, v[0] ?? activeBook.currentPage)
                            );
                            void changePage(p);
                          }}
                          disabled={!pdfUrl || !!activeBook.completedAt}
                        />
                        <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                          {sliderPage}/{sliderMax}
                        </span>
                      </div>
                    )}
                  </div>

                  <div
                    className={`border rounded-xl p-2 ${isFullscreen ? "flex-1 min-h-0 overflow-hidden bg-muted/30 flex flex-col" : "bg-muted/30"}`}
                  >
                    {pdfUrl ? (
                      <div
                        className={`grid gap-3 h-full min-h-[50vh] sm:min-h-[60vh] ${
                          showOutline ? "lg:grid-cols-12" : "grid-cols-1"
                        }`}
                      >
                        {showOutline && (
                          <nav
                            className="lg:col-span-4 border rounded-lg p-3 overflow-auto bg-card max-h-[40vh] lg:max-h-none"
                            aria-label="PDF 目录"
                          >
                            <p className="text-xs text-muted-foreground mb-2">
                              宽屏并排显示目录；窄屏可先隐藏目录获得更多阅读宽度。
                            </p>
                            <Document file={pdfUrl} loading="目录加载中...">
                              <Outline
                                onItemClick={({ pageNumber }) => {
                                  if (typeof pageNumber === "number") {
                                    void changePage(pageNumber);
                                    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1024px)").matches) {
                                      setShowOutline(false);
                                    }
                                    if (isFullscreen) setShowOutline(false);
                                  }
                                }}
                              />
                            </Document>
                          </nav>
                        )}
                        <div
                          ref={pagePaneRef}
                          className={`overflow-auto rounded-lg border bg-background p-2 ${
                            showOutline ? "lg:col-span-8" : "col-span-1 min-h-[50vh]"
                          }`}
                          onScroll={(e) => handlePagePaneScroll(e)}
                          onWheel={(e) => {
                            void handlePagePaneWheel(e);
                          }}
                          role="presentation"
                          tabIndex={-1}
                        >
                          <Document file={pdfUrl} loading="PDF 加载中...">
                            <div className="flex justify-center">
                              <Page
                                pageNumber={activeBook.currentPage}
                                width={renderWidth}
                                renderAnnotationLayer
                                renderTextLayer
                              />
                            </div>
                          </Document>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground p-4">PDF 地址不可用。</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="annotations" className="mt-0 focus-visible:outline-none">
          {!activeBook ? (
            <p className="text-sm text-muted-foreground py-8 text-center">请先在「书架」选择一本书。</p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="min-h-[200px]">
                <CardHeader className="pb-2 space-y-0">
                  <CardTitle className="text-lg">书签</CardTitle>
                  <p className="text-xs text-muted-foreground font-normal mt-1">
                    快捷键 <kbd className="px-1 rounded border bg-muted text-[0.65rem]">Ctrl/⌘+B</kbd>{" "}
                    可为当前页添加书签；列表按页码从新到旧。
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="书签备注（可选）"
                      value={bookmarkNote}
                      aria-label="新书签备注（可选）"
                      onChange={(e) => setBookmarkNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) addBookmark();
                      }}
                    />
                    <Button onClick={() => addBookmark()} disabled={!!activeBook?.completedAt} aria-label="添加当前页书签">
                      <BookmarkPlus className="size-4 sm:mr-1" aria-hidden />
                      <span>{activeBook?.completedAt ? "已完结" : "添加书签"}</span>
                    </Button>
                  </div>
                  <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {activeBookmarks.map((b) => (
                      <li key={b.id} className="border rounded-xl p-3 text-sm flex flex-col gap-2 sm:flex-row sm:items-start">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs font-semibold px-2 py-1 tabular-nums">
                            p.{b.page}
                          </span>
                          <button
                            type="button"
                            className="text-left text-emerald-700 dark:text-emerald-400 hover:underline font-medium truncate"
                            onClick={() => void changePage(b.page)}
                          >
                            跳转到第 {b.page} 页
                          </button>
                        </div>
                        <p className="text-muted-foreground flex-1 sm:pt-0.5 line-clamp-2 break-words">
                          {b.note || "无备注"}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 self-end sm:self-start"
                          aria-label="删除此书签"
                          onClick={() => removeBookmark(b.id)}
                        >
                          <Trash2 className="size-4 text-destructive" aria-hidden />
                        </Button>
                      </li>
                    ))}
                    {activeBookmarks.length === 0 && (
                      <li className="text-sm text-muted-foreground">暂无书签。</li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              <Card className="min-h-[200px]">
                <CardHeader className="pb-2 space-y-0">
                  <CardTitle className="text-lg">句子收藏</CardTitle>
                  <p className="text-xs text-muted-foreground font-normal mt-1">
                    在「阅读」里用鼠标选中 PDF 文字，回到此处点击收藏；列表按页码从新到旧。
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={addQuoteFromSelection}
                    disabled={!!activeBook?.completedAt}
                    className="w-full sm:w-auto touch-manipulation"
                    aria-label="将当前在 PDF 中选中的文字加入收藏"
                  >
                    收藏当前选中文字
                  </Button>
                  <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {activeQuotes.map((q) => (
                      <li key={q.id} className="border rounded-xl p-3 text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold px-2 py-1 tabular-nums">
                            p.{q.page}
                          </span>
                          <button
                            type="button"
                            className="text-emerald-700 dark:text-emerald-400 hover:underline text-sm font-medium"
                            onClick={() => void changePage(q.page)}
                          >
                            跳转到第 {q.page} 页
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto shrink-0"
                            aria-label="删除此摘抄"
                            onClick={() => removeQuote(q.id)}
                          >
                            <Trash2 className="size-4 text-destructive" aria-hidden />
                          </Button>
                        </div>
                        <blockquote className="text-foreground/90 pl-3 border-l-2 border-emerald-300 dark:border-emerald-700 whitespace-pre-wrap line-clamp-6">
                          {q.text}
                        </blockquote>
                      </li>
                    ))}
                    {activeQuotes.length === 0 && (
                      <li className="text-sm text-muted-foreground">暂无句子收藏。</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
