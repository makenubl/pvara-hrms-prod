import React, { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import StorageManager from '../components/StorageManager';
import DocumentChat from './DocumentChat';

const Storage = () => {
  const [documentChatState, setDocumentChatState] = useState(null);

  const handleOpenDocumentChat = (documentName, folderName) => {
    setDocumentChatState({ documentName, folderName });
  };

  const handleCloseDocumentChat = () => {
    setDocumentChatState(null);
  };

  // If document chat is open, show full-screen chat
  if (documentChatState) {
    return (
      <DocumentChat
        documentName={documentChatState.documentName}
        folderName={documentChatState.folderName}
        onBack={handleCloseDocumentChat}
      />
    );
  }

  return (
    <MainLayout>
      <StorageManager onOpenDocumentChat={handleOpenDocumentChat} />
    </MainLayout>
  );
};

export default Storage;
