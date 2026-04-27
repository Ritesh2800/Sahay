import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { Send, Image as ImageIcon, MessageSquare, MoreVertical, Edit2, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Community() {
  const { user, userData } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log("Community.tsx effect: user:", user?.uid);
    if (!user) return;
    const q = query(collection(db, "posts"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      console.log("Community.tsx effect: fetched posts:", snapshot.docs.length);
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Firestore Error fetching posts: ", error);
    });
    return unsub;
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() && !image) return;
    if (!user) return;

    try {
      await addDoc(collection(db, "posts"), {
        author_id: user.uid,
        author_name: userData?.name || user.email || "Unknown User",
        author_role: userData?.role || "Volunteer",
        ngo_id: userData?.ngo_id || null,
        content: newPost.trim(),
        image_url: image,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      setNewPost("");
      setImage(null);
    } catch (error) {
      console.error("Error creating post", error);
    }
  };

  const handleUpdatePost = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      await updateDoc(doc(db, "posts", id), {
        content: editContent.trim(),
        updated_at: serverTimestamp()
      });
      setEditingPostId(null);
    } catch (error) {
      console.error("Error updating post", error);
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      await deleteDoc(doc(db, "posts", id));
    } catch (error) {
      console.error("Error deleting post", error);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  return (
    <div className="p-4 md:p-6 text-text-primary h-full overflow-y-auto pb-40">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-black italic tracking-tight uppercase"> <span className="text-blue-500">Community</span></h2>
          <p className="text-[10px] text-text-secondary uppercase tracking-[0.2em] font-bold">Explore your Community</p>
        </div>
      </div>

      {/* Create Post */}
      <div className="bg-surface border border-border-theme p-4 rounded-3xl mb-8 space-y-4 shadow-sm">
        <textarea
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          placeholder="Share an update, request help, or post an image..."
          className="w-full bg-surface-lighter rounded-2xl p-4 text-sm focus:outline-none border border-border-theme focus:border-blue-500/50 transition-colors resize-none h-20 placeholder:text-text-secondary/50 placeholder:italic"
        />
        
        {image && (
          <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-border-theme shadow-sm">
            <img src={image} alt="Upload preview" className="w-full h-full object-cover" />
            <button onClick={() => setImage(null)} className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500 transition-colors text-white rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex justify-between items-center">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors rounded-xl text-[10px] font-black uppercase tracking-widest">
            <ImageIcon className="w-4 h-4" /> Add Image
          </button>
          
          <button onClick={handleCreatePost} disabled={!newPost.trim() && !image} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:hover:bg-blue-600 transition-all rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 text-[10px] font-black uppercase tracking-widest">
            <Send className="w-4 h-4" /> POST
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-6">
        {posts.map(post => (
          <PostItem 
            key={post.id} 
            post={post} 
            user={user} 
            editingPostId={editingPostId}
            setEditingPostId={setEditingPostId}
            editContent={editContent}
            setEditContent={setEditContent}
            handleUpdatePost={handleUpdatePost}
            handleDeletePost={handleDeletePost}
            isCommentsExpanded={expandedComments.has(post.id)}
            toggleComments={() => toggleComments(post.id)}
          />
        ))}
        {posts.length === 0 && (
          <p className="text-center py-12 text-text-secondary italic text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-border-theme rounded-3xl">No Community Posts</p>
        )}
      </div>
    </div>
  );
}

function PostItem({ post, user, editingPostId, setEditingPostId, editContent, setEditContent, handleUpdatePost, handleDeletePost, isCommentsExpanded, toggleComments }: any) {
  const isAuthor = user?.uid === post.author_id;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-border-theme rounded-[32px] p-5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-sm font-black italic tracking-tight uppercase text-text-primary">{post.author_name}</h4>
          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{post.author_role} {post.ngo_id ? ' // Affiliated' : ''}</p>
        </div>
        {isAuthor && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (editingPostId === post.id) {
                  setEditingPostId(null);
                } else {
                  setEditingPostId(post.id);
                  setEditContent(post.content);
                }
              }}
              className="p-2 text-text-secondary hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeletePost(post.id)}
              className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {editingPostId === post.id ? (
        <div className="space-y-3 mb-4">
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="w-full bg-surface-lighter rounded-xl p-3 text-sm focus:outline-none border border-border-theme focus:border-blue-500/50 transition-colors resize-none h-20"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditingPostId(null)} className="px-4 py-2 hover:bg-surface-lighter rounded-xl text-[10px] font-black uppercase tracking-widest text-text-secondary transition-colors">Cancel</button>
            <button onClick={() => handleUpdatePost(post.id)} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-colors">Save</button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-secondary mb-4 leading-relaxed whitespace-pre-wrap">{post.content}</p>
      )}

      {post.image_url && (
        <div className="rounded-2xl overflow-hidden border border-border-theme mb-4 max-h-[400px]">
          <img src={post.image_url} alt="Post attachment" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border-theme/50">
        <button onClick={toggleComments} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-blue-500 transition-colors group">
          <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" /> Comments
        </button>
      </div>

      <AnimatePresence>
        {isCommentsExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <CommentsSection postId={post.id} user={user} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CommentsSection({ postId, user }: { postId: string, user: any }) {
  const { userData } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "comments"), orderBy("created_at", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(c => c.post_id === postId));
    });
    return unsub;
  }, [postId, user]);

  const handleCreateComment = async () => {
    if (!newComment.trim() || !user) return;
    try {
      await addDoc(collection(db, "comments"), {
        post_id: postId,
        author_id: user.uid,
        author_name: userData?.name || user.email || "Unknown",
        content: newComment.trim(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      setNewComment("");
    } catch (error) {
      console.error("Error creating comment", error);
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      await deleteDoc(doc(db, "comments", id));
    } catch (error) {
      console.error("Error deleting comment", error);
    }
  };

  const handleUpdateComment = async (id: string) => {
      if (!editContent.trim()) return;
      try {
          await updateDoc(doc(db, "comments", id), {
              content: editContent.trim(),
              updated_at: serverTimestamp()
          });
          setEditingCommentId(null);
      } catch (error) {
          console.error("Error updating comment", error);
      }
  }

  return (
    <div className="mt-4 pt-4 border-t border-border-theme">
      <div className="space-y-4 mb-4">
        {comments.map(comment => (
          <div key={comment.id} className="bg-surface-lighter rounded-2xl p-4 border border-border-theme">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest italic text-text-primary">{comment.author_name}</span>
              {user?.uid === comment.author_id && (
                <div className="flex items-center gap-1">
                  <button onClick={() => {
                      if (editingCommentId === comment.id) {
                          setEditingCommentId(null);
                      } else {
                          setEditingCommentId(comment.id);
                          setEditContent(comment.content);
                      }
                  }} className="p-1 hover:text-blue-500 text-text-secondary transition-colors">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDeleteComment(comment.id)} className="p-1 hover:text-red-500 text-text-secondary transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            
            {editingCommentId === comment.id ? (
                <div className="space-y-2">
                    <input 
                        type="text" 
                        value={editContent} 
                        onChange={e => setEditContent(e.target.value)} 
                        className="w-full bg-surface rounded-lg p-2 text-xs focus:outline-none border border-border-theme focus:border-blue-500/50 transition-colors"
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingCommentId(null)} className="px-3 py-1 hover:bg-surface rounded-lg text-[8px] font-black uppercase tracking-widest text-text-secondary transition-colors">Cancel</button>
                        <button onClick={() => handleUpdateComment(comment.id)} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded-lg text-[8px] font-black uppercase tracking-widest text-white transition-colors">Save</button>
                    </div>
                </div>
            ) : (
                <p className="text-xs text-text-secondary leading-relaxed">{comment.content}</p>
            )}

          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <input 
          type="text" 
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Reply to transmission..."
          className="flex-1 bg-surface-lighter rounded-xl px-4 text-sm focus:outline-none border border-border-theme focus:border-blue-500/50 transition-colors placeholder:text-text-secondary/50 placeholder:italic"
        />
        <button 
          onClick={handleCreateComment}
          disabled={!newComment.trim()}
          className="p-3 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white disabled:opacity-50 transition-colors rounded-xl"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
