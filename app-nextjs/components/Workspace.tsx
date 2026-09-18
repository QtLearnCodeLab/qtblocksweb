import React, { useState, useEffect, useRef } from 'react';

export default function Workspace() {
  const [activeTab, setActiveTab] = useState('blocks');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      // Ensure message is from the expected origin and type
      if (event.origin === window.location.origin && event.data.type === 'IFRAME_READY') {
        console.log('Blockly iframe is ready.');
        // Send initial tab state to the iframe
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ type: 'SET_ACTIVE_TAB', payload: activeTab }, window.location.origin);
        }
      }
    };

    window.addEventListener('message', handleIframeMessage);

    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [activeTab]); // Re-run effect if activeTab changes to send updated state

  const handleTabClick = (tabName: string) => {
    setActiveTab(tabName);
    // Send message to iframe to switch tabs
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'SET_ACTIVE_TAB', payload: tabName }, window.location.origin);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-none border-b border-gray-300">
        <button
          className={`px-4 py-2 font-semibold ${activeTab === 'blocks' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => handleTabClick('blocks')}
        >
          Blocks
        </button>
        <button
          className={`px-4 py-2 font-semibold ${activeTab === 'code' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => handleTabClick('code')}
        >
          Code
        </button>
      </div>
      <div className="relative min-h-0 flex-1 bg-white p-4">
        <iframe
          ref={iframeRef}
          src="/blockly-app-embed.html"
          style={{ border: 'none', width: '100%', height: '100%' }}
          title="Blockly Editor"
        ></iframe>
      </div>
    </div>
  );
}
