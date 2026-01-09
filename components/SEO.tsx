
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
        document.title = title;
        
        const updateMeta = (name: string, content: string) => {
            let element = document.querySelector(`meta[name="${name}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute('name', name);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        const updateOgMeta = (property: string, content: string) => {
            let element = document.querySelector(`meta[property="${property}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute('property', property);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        if (description) {
            updateMeta('description', description);
            updateOgMeta('og:description', description);
            updateMeta('twitter:description', description);
        }

        if (image) {
            updateOgMeta('og:image', image);
            updateMeta('twitter:image', image);
        }

        updateOgMeta('og:type', type);
        updateOgMeta('og:title', title);
        updateMeta('twitter:title', title);
        
        // Removed hash-based URL forcing to allow App.tsx to handle History API
    }, [title, description, image, type, path]);

    return null;
};

export default SEO;
