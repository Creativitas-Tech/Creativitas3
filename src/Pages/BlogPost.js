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
    <div style={{ padding: '2rem' }}>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};

export default BlogPost;