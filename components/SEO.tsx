
import React, { useEffect } from 'react';

interface SEOProps {
    title: string;
    description?: string;
    image?: string;
    type?: string;
    path?: string;
}

const SEO: React.FC<SEOProps> = ({ title, description, image, type = 'website', path = '' }) => {
    useEffect(() => {
        // 1. Update Title
        document.title = title;
        
        // 2. Helper to force update meta tags
        const setMeta = (selector: string, content: string) => {
            // Remove existing to force update
            const oldTag = document.querySelector(selector);
            if (oldTag) oldTag.remove();

            // Create new
            const meta = document.createElement('meta');
            // Determine if it uses 'name' or 'property'
            if (selector.startsWith('meta[property=')) {
                const propName = selector.match(/property="([^"]*)"/)?.[1];
                if(propName) meta.setAttribute('property', propName);
            } else {
                const nameAttr = selector.match(/name="([^"]*)"/)?.[1];
                if(nameAttr) meta.setAttribute('name', nameAttr);
            }
            
            meta.setAttribute('content', content);
            document.head.appendChild(meta);
        };

        // 3. Update Standard Tags
        if (description) {
            setMeta('meta[name="description"]', description);
            setMeta('meta[property="og:description"]', description);
            setMeta('meta[name="twitter:description"]', description);
        }

        // 4. Update Image Tags
        if (image) {
            setMeta('meta[property="og:image"]', image);
            setMeta('meta[name="twitter:image"]', image);
        }

        // 5. Update Type & Title Tags
        setMeta('meta[property="og:type"]', type);
        setMeta('meta[property="og:title"]', title);
        setMeta('meta[name="twitter:title"]', title);
        setMeta('meta[property="og:url"]', window.location.href);

    }, [title, description, image, type, path]);

    return null;
};

export default SEO;
