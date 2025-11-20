import React from 'react';
import Image from 'next/image';

export default function FloatingHelpButton() {
    return (
        <a
            // href="https://notebooklm.google.com/notebook/ed51e06c-32f3-49d1-9569-708cdb4c5bee"
            href="https://notebooklm.google.com/notebook/580abcc6-6d39-4f7a-a9d9-7fbc39167c87/preview"
            target="_blank"
            rel="noopener noreferrer"

            className="group fixed right-4 bottom-4 z-50 text-white w-14 h-14 rounded-full flex items-center justify-center transition-colors"
            aria-label="Abrir notebook"
        >
            <Image src="/iconSoporte.svg" alt="Soporte" width={60} height={60} className="w-15 h-15" />
                        <span
                role="tooltip"
                aria-hidden="true"
                className="text-center pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs px-3 py-2 rounded-md shadow-lg whitespace-nowrap"
            >
                Hola!<br />¿en que puedo<br />ayudarte?<br /></span>
        </a>
    );
}