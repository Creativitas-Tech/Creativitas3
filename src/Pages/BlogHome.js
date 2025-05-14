import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { marked } from 'marked';

const blogSlugs = [
  'gettingStarted',
  'ui_layout_blog_post'
];

const BlogHome = () => {
  const [posts, setPosts] = useState([]);
  const [introHtml, setIntroHtml] = useState('');

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/blog/blogIntro.md`)
      .then((res) => res.text())
      .then((text) => setIntroHtml(marked(text)));

    const loadTitles = async () => {
      const results = await Promise.all(
        blogSlugs.map(async (slug) => {
          try {
            const res = await fetch(`${process.env.PUBLIC_URL}/blog/${slug}.md`);
            const text = await res.text();
            const title = text.split('\n')[0].replace(/^# /, ''); // extract first line and strip `# `
            return { title, slug };
          } catch (err) {
            console.error(`Failed to load post: ${slug}`, err);
            return null;
          }
        })
      );
      setPosts(results.filter(Boolean));
    };

    loadTitles();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Blog</h1>
      <div
        className="blog-intro"
        dangerouslySetInnerHTML={{ __html: introHtml }}
      />
      <ul>
        {posts.map(({ title, slug }) => (
          <li key={slug}>
            <Link to={`/blog/${slug}`}>{title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BlogHome;