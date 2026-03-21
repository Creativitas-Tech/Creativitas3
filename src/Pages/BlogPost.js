// src/Pages/BlogPost.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { marked } from 'marked';

const BlogPost = () => {
  const { slug } = useParams();
  const [content, setContent] = useState('');

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/blog/${slug}.md`)
      .then(res => res.text())
      .then(text => setContent(marked(text)))
      .catch(err => setContent('Post not found.'));
  }, [slug]);

  return (
    <div style={{
      backgroundColor: '#212121',
      padding: '3rem 1rem',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        color: '#E0E0E0',
        fontFamily: `'Georgia', serif`,
        lineHeight: '1.6',
      }}>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
      <style>{`
        pre {
          background: #f6f0e8;
          padding: 1rem;
          border-radius: 6px;
          overflow-x: auto;
          font-family: 'Courier New', monospace;
          font-size: 0.95rem;
        }

        code {
          background: #E0E0E0; /* Note: Removed the extra '#' from your snippet */
          color: #1A1A1A;      /* Deep charcoal for high contrast */
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-weight: 600;    /* Optional: slightly bolder helps monospace stand out */
        }

        h1, h2, h3 {
          color: ##E0E0E0;
        }

        a {
          color: ##E0E0E0;
          text-decoration: underline;
        }

        blockquote {
          border-left: 4px solid ##E0E0E0;
          padding-left: 1rem;
          color: #6a4e3d;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default BlogPost;