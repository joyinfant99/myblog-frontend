// src/components/DefaultSEO.js
import React from 'react';
import { Helmet } from 'react-helmet-async';

const DefaultSEO = () => {
  const siteUrl = process.env.REACT_APP_SITE_URL || 'https://joyinfant.me';
  const defaultImage = `${siteUrl}/default-social-image.jpg`; // Add your default social image
  const siteName = "Joy's Blog";
  const defaultTitle = "Joy's Blog - Technology & Life";
  const defaultDescription = 'Exploring software development, technology, and life experiences through thoughtful articles and insights.';

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{defaultTitle}</title>
      <meta name="description" content={defaultDescription} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={siteUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:title" content={defaultTitle} />
      <meta property="og:description" content={defaultDescription} />
      <meta property="og:image" content={defaultImage} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={siteUrl} />
      <meta name="twitter:title" content={defaultTitle} />
      <meta name="twitter:description" content={defaultDescription} />
      <meta name="twitter:image" content={defaultImage} />

      {/* LinkedIn */}
      <meta name="linkedin:card" content="summary_large_image" />
      <meta name="linkedin:title" content={defaultTitle} />
      <meta name="linkedin:description" content={defaultDescription} />
      <meta name="linkedin:image" content={defaultImage} />

      {/* Additional SEO Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content="Joy Infant" />
      <meta name="keywords" content="technology, software development, programming, blog, tech blog" />

      {/* Language and Locale */}
      <meta property="og:locale" content="en_US" />
      <html lang="en" />

      {/* Color Scheme */}
      <meta name="theme-color" content="#ffffff" />
      <meta name="msapplication-TileColor" content="#ffffff" />

      {/* Optional: Favicon (add your favicon files to public directory) */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Optional: RSS Feed */}
      <link 
        rel="alternate" 
        type="application/rss+xml" 
        title={`${siteName} RSS Feed`}
        href="/rss.xml"
      />

      {/* Schema.org JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": siteName,
          "url": siteUrl,
          "description": defaultDescription,
          "author": {
            "@type": "Person",
            "name": "Joy Infant"
          },
          "publisher": {
            "@type": "Organization",
            "name": siteName,
            "logo": {
              "@type": "ImageObject",
              "url": `${siteUrl}/logo.png`
            }
          }
        })}
      </script>
    </Helmet>
  );
};

export default DefaultSEO;