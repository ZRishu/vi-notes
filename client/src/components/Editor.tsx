import React, { useState, useRef } from 'react';
import api from '../api';

const Editor: React.FC = () => {
  const [content, setContent] = useState('');
  const [keystrokeData, setKeystrokeData] = useState<any[]>([]);
  const [pastedEvents, setPastedEvents] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  
  const keyDownTimes = useRef<{ [key: string]: number }>({});

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const timestamp = Date.now();
    keyDownTimes.current[e.code] = timestamp;
    
    setKeystrokeData(prev => [...prev, {
      type: 'keydown',
      keyCode: e.code,
      timestamp
    }]);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const timestamp = Date.now();
    const duration = keyDownTimes.current[e.code] ? timestamp - keyDownTimes.current[e.code] : 0;
    
    setKeystrokeData(prev => [...prev, {
      type: 'keyup',
      keyCode: e.code,
      timestamp,
      duration
    }]);
    
    delete keyDownTimes.current[e.code];
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const timestamp = Date.now();
    
    setPastedEvents(prev => [...prev, {
      timestamp,
      textLength: pastedText.length,
      content: pastedText // Storing content as well as length if needed, though requirement says "amount of text pasted"
    }]);
  };

  const handleSave = async () => {
    try {
      await api.post('/sessions', {
        content,
        keystrokeData,
        pastedEvents
      });
      setMessage('Session saved successfully!');
      // Optionally clear
      // setContent('');
      // setKeystrokeData([]);
      // setPastedEvents([]);
    } catch (error) {
      setMessage('Failed to save session.');
      console.error(error);
    }
  };

  return (
    <div className="editor-container">
      <h2>Writing Editor</h2>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onPaste={handlePaste}
        placeholder="Start writing here..."
        className="writing-area"
      />
      <div className="controls">
        <button onClick={handleSave}>Save Session</button>
      </div>
      {message && <p>{message}</p>}
      <div className="stats">
        <p>Keystrokes recorded: {keystrokeData.length}</p>
        <p>Paste events: {pastedEvents.length}</p>
      </div>
    </div>
  );
};

export default Editor;
