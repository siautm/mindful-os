import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Lightbulb, Plus, X, Search, Edit2, Trash2 } from "lucide-react";
import { getIdeas, saveIdeas, IdeaEntry } from "../lib/storage";
import { toast } from "sonner";

export function Ideas() {
  const [ideas, setIdeas] = useState<IdeaEntry[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<IdeaEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newIdea, setNewIdea] = useState({
    title: "",
    content: "",
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    loadIdeas();
  }, []);

  function loadIdeas() {
    setIdeas(getIdeas());
  }

  function handleAddIdea() {
    if (!newIdea.title.trim() || !newIdea.content.trim()) {
      toast.error("Please enter title and content");
      return;
    }

    const idea: IdeaEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      title: newIdea.title.trim(),
      content: newIdea.content.trim(),
      tags: newIdea.tags,
    };

    const updatedIdeas = [idea, ...ideas];
    setIdeas(updatedIdeas);
    saveIdeas(updatedIdeas);

    setNewIdea({ title: "", content: "", tags: [] });
    setIsAddDialogOpen(false);
    toast.success("Idea saved!");
  }

  function handleUpdateIdea() {
    if (!editingIdea || !editingIdea.title.trim() || !editingIdea.content.trim()) {
      toast.error("Please enter title and content");
      return;
    }

    const updatedIdeas = ideas.map(i => 
      i.id === editingIdea.id ? editingIdea : i
    );
    setIdeas(updatedIdeas);
    saveIdeas(updatedIdeas);
    setEditingIdea(null);
    toast.success("Idea updated!");
  }

  function handleDeleteIdea(id: string) {
    const updatedIdeas = ideas.filter(i => i.id !== id);
    setIdeas(updatedIdeas);
    saveIdeas(updatedIdeas);
    toast.success("Idea deleted");
  }

  function handleAddTag(toNewIdea: boolean = true) {
    if (!newTag.trim()) return;

    if (toNewIdea) {
      if (!newIdea.tags.includes(newTag.trim())) {
        setNewIdea({
          ...newIdea,
          tags: [...newIdea.tags, newTag.trim()],
        });
      }
    } else if (editingIdea) {
      if (!editingIdea.tags.includes(newTag.trim())) {
        setEditingIdea({
          ...editingIdea,
          tags: [...editingIdea.tags, newTag.trim()],
        });
      }
    }
    setNewTag("");
  }

  function handleRemoveTag(tag: string, fromNewIdea: boolean = true) {
    if (fromNewIdea) {
      setNewIdea({
        ...newIdea,
        tags: newIdea.tags.filter(t => t !== tag),
      });
    } else if (editingIdea) {
      setEditingIdea({
        ...editingIdea,
        tags: editingIdea.tags.filter(t => t !== tag),
      });
    }
  }

  const filteredIdeas = ideas.filter(idea =>
    idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    idea.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    idea.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const allTags = Array.from(new Set(ideas.flatMap(i => i.tags)));

  return (
    <div className="px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:p-8 md:pb-8 space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Daily Ideas</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Capture your thoughts and inspirations</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full sm:w-auto shrink-0">
              <Plus className="size-5 mr-2" />
              New Idea
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl w-[min(100vw-1.5rem,42rem)] max-h-[min(90dvh,720px)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Idea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="ideaTitle">Title</Label>
                <Input
                  id="ideaTitle"
                  value={newIdea.title}
                  onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                  placeholder="Brief description of your idea"
                />
              </div>
              <div>
                <Label htmlFor="ideaContent">Content</Label>
                <Textarea
                  id="ideaContent"
                  value={newIdea.content}
                  onChange={(e) => setNewIdea({ ...newIdea, content: e.target.value })}
                  placeholder="Elaborate on your idea..."
                  rows={8}
                  className="resize-none"
                />
              </div>
              <div>
                <Label htmlFor="ideaTags">Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="ideaTags"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag(true);
                      }
                    }}
                  />
                  <Button onClick={() => handleAddTag(true)} size="sm" variant="outline">
                    <Plus className="size-4" />
                  </Button>
                </div>
                {newIdea.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newIdea.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag, true)}
                          className="ml-1 hover:bg-gray-300 rounded-full"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={handleAddIdea} className="w-full">
                Save Idea
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ideas by title, content, or tags..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tag Filter */}
      {allTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Filter by Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer hover:bg-purple-50"
                  onClick={() => setSearchQuery(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Lightbulb className="size-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  {ideas.length}
                </div>
                <p className="text-sm text-gray-600">Total Ideas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🏷️</span>
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  {allTags.length}
                </div>
                <p className="text-sm text-gray-600">Unique Tags</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  {ideas.filter(i => 
                    new Date(i.date).toDateString() === new Date().toDateString()
                  ).length}
                </div>
                <p className="text-sm text-gray-600">Today's Ideas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ideas List */}
      {filteredIdeas.length > 0 ? (
        <div className="grid gap-4">
          {filteredIdeas.map((idea) => (
            <Card key={idea.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{idea.title}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(idea.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingIdea(idea)}
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteIdea(idea.id)}
                    >
                      <Trash2 className="size-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap mb-3">{idea.content}</p>
                {idea.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {idea.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Lightbulb className="size-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">
                {searchQuery ? "No ideas found" : "No ideas yet"}
              </p>
              <p className="text-sm">
                {searchQuery
                  ? "Try a different search term"
                  : "Click 'New Idea' to capture your first thought!"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      {editingIdea && (
        <Dialog open={!!editingIdea} onOpenChange={() => setEditingIdea(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Idea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="editTitle">Title</Label>
                <Input
                  id="editTitle"
                  value={editingIdea.title}
                  onChange={(e) =>
                    setEditingIdea({ ...editingIdea, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editContent">Content</Label>
                <Textarea
                  id="editContent"
                  value={editingIdea.content}
                  onChange={(e) =>
                    setEditingIdea({ ...editingIdea, content: e.target.value })
                  }
                  rows={8}
                  className="resize-none"
                />
              </div>
              <div>
                <Label htmlFor="editTags">Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="editTags"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag(false);
                      }
                    }}
                  />
                  <Button onClick={() => handleAddTag(false)} size="sm" variant="outline">
                    <Plus className="size-4" />
                  </Button>
                </div>
                {editingIdea.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editingIdea.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag, false)}
                          className="ml-1 hover:bg-gray-300 rounded-full"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateIdea} className="flex-1">
                  Save Changes
                </Button>
                <Button
                  onClick={() => setEditingIdea(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
