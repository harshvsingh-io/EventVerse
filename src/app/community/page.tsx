"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { db, User, CommunityPost, CommunityComment, generateUUID } from "@/lib/db";
import { MessageSquare, Flag, Heart, Send, Plus, ArrowUp, CheckCircle, ShieldAlert } from "lucide-react";

export default function CommunityPage() {
  const router = useRouter();
  
  // Session & database states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  
  // Create post states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // UI status
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [newCommentBody, setNewCommentBody] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const user = db.getCurrentUser();
    if (!user) {
      router.push("/");
      return;
    }
    setCurrentUser(user);
    loadPosts(user.collegeId);
  }, []);

  const loadPosts = (collegeId: string) => {
    // Isolated posts for this college (RLS simulator)
    const collegePosts = db.getIsolatedPosts(collegeId)
      .filter(p => !p.flagged) // don't show currently flagged posts waiting moderation
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const allComments = db.getPostComments();

    setPosts(collegePosts);
    setComments(allComments);
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentUser) return;
    if (!title.trim()) {
      setError("Title is required!");
      return;
    }

    const currentPosts = db.getPosts();
    const newPost: CommunityPost = {
      id: generateUUID(),
      collegeId: currentUser.collegeId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      title: title.trim(),
      body: body.trim(),
      imageUrl: imageUrl.trim() || undefined,
      likes: [],
      createdAt: new Date().toISOString()
    };

    currentPosts.unshift(newPost);
    db.setPosts(currentPosts);
    
    setShowCreateModal(false);
    setTitle("");
    setBody("");
    setImageUrl("");
    setSuccess("Community post shared successfully!");
    loadPosts(currentUser.collegeId);
  };

  const handleToggleLike = (postId: string) => {
    if (!currentUser) return;
    const currentPosts = db.getPosts();
    const idx = currentPosts.findIndex(p => p.id === postId);
    
    if (idx !== -1) {
      const likes = currentPosts[idx].likes;
      const isLiked = likes.includes(currentUser.id);
      
      if (isLiked) {
        currentPosts[idx].likes = likes.filter(id => id !== currentUser.id);
      } else {
        currentPosts[idx].likes = [...likes, currentUser.id];
      }

      db.setPosts(currentPosts);
      loadPosts(currentUser.collegeId);
    }
  };

  const handleFlagPost = (postId: string) => {
    if (!currentUser) return;
    if (confirm("Are you sure you want to flag this post for moderation review? It will be temporarily hidden from the community feed.")) {
      const currentPosts = db.getPosts();
      const idx = currentPosts.findIndex(p => p.id === postId);
      
      if (idx !== -1) {
        currentPosts[idx].flagged = true; // flag it
        db.setPosts(currentPosts);
        setSuccess("Thank you. Post flagged and forwarded to College Admin for moderation.");
        loadPosts(currentUser.collegeId);
      }
    }
  };

  const handleToggleComments = (postId: string) => {
    if (expandedCommentsPostId === postId) {
      setExpandedCommentsPostId(null);
    } else {
      setExpandedCommentsPostId(postId);
      setNewCommentBody("");
    }
  };

  const handleAddComment = (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!currentUser || !newCommentBody.trim()) return;

    const currentComments = db.getPostComments();
    const newComment: CommunityComment = {
      id: generateUUID(),
      postId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      body: newCommentBody.trim(),
      createdAt: new Date().toISOString()
    };

    currentComments.push(newComment);
    db.setPostComments(currentComments);
    setNewCommentBody("");
    
    // Refresh
    loadPosts(currentUser.collegeId);
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#06060c] text-white flex flex-col">
      <Header />

      {/* Share Toast */}
      {success && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-brand-primary text-white text-xs font-semibold rounded-xl border border-white/10 shadow-2xl animate-bounce">
          {success}
        </div>
      )}

      {/* Container */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-white">Campus Community Board</h2>
            <p className="text-xs text-gray-400">Open Reddit-style discussion. Connect and share with fellow campus students.</p>
          </div>
          <button
            onClick={() => {
              setError("");
              setShowCreateModal(true);
            }}
            className="bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl py-2.5 px-4 font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-brand-primary/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Post</span>
          </button>
        </div>

        {/* Board Feed */}
        <div className="space-y-4">
          {posts.length > 0 ? (
            posts.map((post) => {
              const isLiked = post.likes.includes(currentUser.id);
              const postComments = comments.filter(c => c.postId === post.id);
              const isExpanded = expandedCommentsPostId === post.id;

              return (
                <div key={post.id} className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
                  
                  {/* User meta */}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs uppercase text-gray-300">
                        {post.userName[0]}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-200">{post.userName}</span>
                        <span className={`text-[8px] tracking-wide font-extrabold ml-1.5 px-2 py-0.5 rounded-full ${
                          post.userRole === 'student' ? 'bg-white/5 text-gray-400' : 'bg-brand-primary/20 text-brand-primary'
                        }`}>
                          {post.userRole.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  {/* Title & Body */}
                  <div className="space-y-2">
                    <h3 className="font-display font-bold text-base sm:text-lg text-white leading-snug">{post.title}</h3>
                    {post.body && (
                      <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{post.body}</p>
                    )}
                  </div>

                  {/* Image attachment */}
                  {post.imageUrl && (
                    <div className="relative max-h-96 w-full rounded-xl overflow-hidden border border-white/5 bg-gray-900">
                      <img
                        src={post.imageUrl}
                        alt="Community attachment"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex items-center gap-6">
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                          isLiked ? "text-brand-secondary" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <ArrowUp className={`w-4.5 h-4.5 ${isLiked ? 'stroke-[3]' : ''}`} />
                        <span>{post.likes.length} Upvotes</span>
                      </button>

                      <button
                        onClick={() => handleToggleComments(post.id)}
                        className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                          isExpanded ? "text-brand-primary" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{postComments.length} Comments</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleFlagPost(post.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1"
                      title="Flag Post"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Expandable comments drawer */}
                  {isExpanded && (
                    <div className="border-t border-white/5 pt-4 space-y-4">
                      
                      {/* Form */}
                      <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex gap-2.5 items-center">
                        <div className="w-7 h-7 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center font-bold text-xs uppercase">
                          {currentUser.name[0]}
                        </div>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="Add to the conversation..."
                            value={newCommentBody}
                            onChange={(e) => setNewCommentBody(e.target.value)}
                            className="w-full glass-input rounded-xl py-2 px-3 text-xs"
                          />
                          <button
                            type="submit"
                            disabled={!newCommentBody.trim()}
                            className="absolute right-2 top-1.5 p-1 text-brand-primary hover:text-white disabled:text-gray-600 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </form>

                      {/* Comment Items list */}
                      <div className="space-y-3.5 pl-3">
                        {postComments.length > 0 ? (
                          postComments.map((comment) => (
                            <div key={comment.id} className="flex gap-2.5 items-start">
                              <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-semibold text-[10px] uppercase text-gray-400">
                                {comment.userName[0]}
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-[11px] text-gray-300">{comment.userName}</span>
                                  <span className="text-[8px] text-gray-500 bg-white/5 py-0.5 px-1.5 rounded uppercase">{comment.userRole.replace("_", " ")}</span>
                                </div>
                                <p className="text-[11px] text-gray-300 leading-normal">{comment.body}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-2 text-[10px] text-gray-500">
                            No comments yet.
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              );
            })
          ) : (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl space-y-4">
              <ShieldAlert className="w-10 h-10 text-gray-500 mx-auto" />
              <div>
                <h4 className="font-semibold text-white">Campus board is quiet</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Be the first to post something and start a conversation in your university network!
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CREATE POST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 sm:p-8 w-full max-w-md">
            <h3 className="font-display font-bold text-lg text-white mb-6">Create Community Post</h3>
            <form onSubmit={handleCreatePost} className="space-y-4">
              
              {error && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Post Title *</label>
                <input
                  type="text"
                  placeholder="What's on your mind?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Body / Thoughts</label>
                <textarea
                  placeholder="Share details, questions, or context..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="w-full glass-input rounded-xl p-3 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Attachment Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4.5 py-2.5 text-xs border border-white/5 bg-white/5 hover:bg-white/10 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-bold py-2.5 px-4 rounded-lg"
                >
                  Share Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
