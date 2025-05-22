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
      backgroundColor: '#fff8f0',
      padding: '3rem 1rem',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        color: '#2c2c2c',
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
          background: #f1eae3;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }

        h1, h2, h3 {
          color: #47322d;
        }

        a {
          color: #8b4513;
          text-decoration: underline;
        }

        blockquote {
          border-left: 4px solid #e0c4a8;
          padding-left: 1rem;
          color: #6a4e3d;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default BlogPost;