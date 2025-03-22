import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import socket from '../services/socket';
import '../App.css';

/**
 * ChatPage
 *
 * - Pinned Chats: loaded once from /api/contacts/get-contacts-for-list.
 * - Search for new contacts by email (/api/contacts/search).
 * - Local conversation store (conversations[userId] = array of messages),
 *   so chats don’t vanish if the backend fails to return them.
 * - Real-time messaging via Socket.IO.
 * - Auto-pin new inbound chats on receiving a message.
 * - Delete conversation both locally and via /api/contacts/delete-dm.
 * - Logout ( /api/auth/logout ).
 */

function ChatPage() {
  const navigate = useNavigate();

  // Current logged-in user
  const [currentUser, setCurrentUser] = useState(null);

  // All pinned chats: Array of { userId, email }
  const [pinnedChats, setPinnedChats] = useState([]);

  // The currently selected chat: { userId, email } or null
  const [selectedChat, setSelectedChat] = useState(null);

  // All messages stored locally, shaped like:
  // { [otherUserId]: [ arrayOfMessageObjects ], ... }
  const [conversations, setConversations] = useState({});

  // For searching new contacts by email
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // The user’s typed message
  const [newMessage, setNewMessage] = useState('');

  // For showing errors
  const [errorMsg, setErrorMsg] = useState('');

  //--------------------------------------------------------------------------
  // 1) Check if user is logged in
  //--------------------------------------------------------------------------
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await apiClient.get('/api/auth/userinfo');
        // Adjust if your server returns differently:
        // e.g. setCurrentUser(res.data) if it returns { _id, email, ... }
        setCurrentUser(res.data);
      } catch (err) {
        navigate('/');
      }
    };
    fetchUserInfo();
  }, [navigate]);

  //--------------------------------------------------------------------------
  // 2) Once currentUser is known, fetch pinned chats
  //    (We do this once to see if the server has a list of "recent" chats)
  //--------------------------------------------------------------------------
  useEffect(() => {
    const fetchPinnedChats = async () => {
      try {
        const res = await apiClient.get('/api/contacts/get-contacts-for-list');
        // If your server returns data differently, adjust here
        if (res.data && Array.isArray(res.data.contacts)) {
          const pinned = res.data.contacts.map((c) => {
            if (c.user && c.user._id) {
              return {
                userId: c.user._id,
                email: c.user.email
              };
            }
            return null;
          }).filter(Boolean);
          setPinnedChats(pinned);
        }
      } catch (err) {
        setErrorMsg('Failed to load pinned chats.');
      }
    };

    if (currentUser) {
      fetchPinnedChats();
    }
  }, [currentUser]);

  //--------------------------------------------------------------------------
  // 3) Socket.io: handle inbound messages
  //--------------------------------------------------------------------------
  useEffect(() => {
    function handleReceiveMessage(message) {
      // Identify the "other user" in this conversation
      const otherUserId =
        message.sender._id === currentUser._id
          ? message.recipient._id
          : message.sender._id;

      // Auto-pin them if not pinned
      const pinned = pinnedChats.find((p) => p.userId === otherUserId);
      if (!pinned) {
        // We assume message.sender or message.recipient has an "email" field
        const newEmail =
          message.sender._id === currentUser._id
            ? message.recipient.email
            : message.sender.email;

        setPinnedChats((prev) => [
          ...prev,
          { userId: otherUserId, email: newEmail }
        ]);
      }

      // Store this message in local conversations
      setConversations((prev) => {
        const oldMsgs = prev[otherUserId] || [];
        return {
          ...prev,
          [otherUserId]: [...oldMsgs, message]
        };
      });
    }

    socket.on('receiveMessage', handleReceiveMessage);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [currentUser, pinnedChats]);

  //--------------------------------------------------------------------------
  // 4) Searching for new contacts by email
  //--------------------------------------------------------------------------
  const handleSearch = async () => {
    setErrorMsg('');
    setSearchResults([]);

    const term = searchTerm.trim();
    if (!term) return;

    try {
      const res = await apiClient.post('/api/contacts/search', {
        searchTerm: term
      });
      if (res.data && Array.isArray(res.data.contacts)) {
        // Filter out ourselves
        const filtered = res.data.contacts.filter((u) => u._id !== currentUser._id);
        setSearchResults(filtered);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      setErrorMsg('Search failed. Please try again.');
    }
  };

  //--------------------------------------------------------------------------
  // 5) Start chat from search results => pin them, select them
  //--------------------------------------------------------------------------
  const handleStartChat = (userObj) => {
    // userObj is { _id, email, ... }
    const pinned = pinnedChats.find((p) => p.userId === userObj._id);
    if (!pinned) {
      setPinnedChats((prev) => [
        ...prev,
        { userId: userObj._id, email: userObj.email }
      ]);
    }

    // Select that chat
    const newChat = { userId: userObj._id, email: userObj.email };
    setSelectedChat(newChat);

    // If we haven't loaded messages yet, do it
    if (!conversations[userObj._id]) {
      fetchInitialMessages(userObj._id);
    }

    // Clear search
    setSearchTerm('');
    setSearchResults([]);
  };

  //--------------------------------------------------------------------------
  // 6) Selecting a pinned chat => load from local or server if not loaded
  //--------------------------------------------------------------------------
  const handleSelectPinnedChat = (chat) => {
    setSelectedChat(chat);
    // If we have no local messages for them, fetch from server once
    if (!conversations[chat.userId]) {
      fetchInitialMessages(chat.userId);
    }
  };

  //--------------------------------------------------------------------------
  // 7) Fetch initial messages from the server (/api/messages/get-messages)
  //--------------------------------------------------------------------------
  const fetchInitialMessages = async (otherUserId) => {
    try {
      const res = await apiClient.post('/api/messages/get-messages', {
        id: otherUserId
      });
      const msgs = res.data.messages || [];

      setConversations((prev) => ({
        ...prev,
        [otherUserId]: msgs
      }));
    } catch (err) {
      setErrorMsg('Failed to load messages.');
    }
  };

  //--------------------------------------------------------------------------
  // 8) Send message => store locally and emit socket
  //--------------------------------------------------------------------------
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    if (!selectedChat || !currentUser) return;

    const { userId, email } = selectedChat;
    const msgObj = {
      _id: Date.now().toString(), // local ID
      sender: { _id: currentUser._id, email: currentUser.email },
      recipient: { _id: userId, email },
      content: newMessage,
      messageType: 'text',
      timestamp: new Date().toISOString()
    };

    // Immediately store it locally
    setConversations((prev) => {
      const oldMsgs = prev[userId] || [];
      return {
        ...prev,
        [userId]: [...oldMsgs, msgObj]
      };
    });

    // Emit to server
    socket.emit('sendMessage', {
      sender: currentUser._id,
      recipient: userId,
      content: newMessage,
      messageType: 'text'
    });

    setNewMessage('');
  };

  //--------------------------------------------------------------------------
  // 9) Delete conversation => remove from local & call /api/contacts/delete-dm
  //--------------------------------------------------------------------------
  const handleDeleteMessages = async () => {
    if (!selectedChat) return;
    const { userId } = selectedChat;
    try {
      await apiClient.delete(`/api/contacts/delete-dm/${userId}`);

      // Clear local messages for that user
      setConversations((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });

      // Deselect chat
      setSelectedChat(null);
      alert('Messages deleted successfully.');
    } catch (err) {
      setErrorMsg('Failed to delete messages.');
    }
  };

  //--------------------------------------------------------------------------
  // 10) Logout => /api/auth/logout
  //--------------------------------------------------------------------------
  const handleLogout = async () => {
    try {
      await apiClient.post('/api/auth/logout');
      navigate('/');
    } catch (err) {
      setErrorMsg('Logout failed.');
    }
  };

  //--------------------------------------------------------------------------
  // If user info not loaded, show loading
  //--------------------------------------------------------------------------
  if (!currentUser) {
    return <div className="loading">Loading user info...</div>;
  }

  //--------------------------------------------------------------------------
  // Render UI
  //--------------------------------------------------------------------------
  // The messages for the currently selected chat from local state
  const selectedMessages = selectedChat
    ? conversations[selectedChat.userId] || []
    : [];

  return (
    <div className="container">
      <h2>Welcome, {currentUser.email || 'User'}</h2>
      <button onClick={handleLogout}>Logout</button>

      {errorMsg && <p className="errorMsg">{errorMsg}</p>}

      <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
        {/* LEFT: Search + pinned chats */}
        <div style={{ width: '250px' }}>
          <h3>Search for a Contact</h3>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Enter email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', marginBottom: '6px' }}
            />
            <button onClick={handleSearch}>Search</button>
          </div>
          {/* Show search results */}
          {searchResults.length > 0 && (
            <div style={{ border: '1px solid #ccc', padding: '8px' }}>
              <h4>Search Results:</h4>
              {searchResults.map((usr) => (
                <div key={usr._id} style={{ marginBottom: '6px' }}>
                  <div>{usr.email || '(No email?)'}</div>
                  <button onClick={() => handleStartChat(usr)}>Start Chat</button>
                </div>
              ))}
            </div>
          )}

          {/* Pinned chats */}
          <h3 style={{ marginTop: '20px' }}>Pinned Chats</h3>
          {pinnedChats.length === 0 && (
            <p style={{ fontStyle: 'italic' }}>
              No pinned chats yet. Search above to start a chat.
            </p>
          )}
          {pinnedChats.map((chat) => {
            const isSelected =
              selectedChat && selectedChat.userId === chat.userId;
            return (
              <div
                key={chat.userId}
                onClick={() => handleSelectPinnedChat(chat)}
                className={isSelected ? 'contactSelected' : ''}
                style={{ padding: '8px', borderRadius: '4px', marginBottom: '6px' }}
              >
                {chat.email}
              </div>
            );
          })}
        </div>

        {/* RIGHT: Chat window */}
        <div style={{ flex: 1 }} className="chatWindow">
          <h3>Chat</h3>
          {selectedChat ? (
            <>
              <div className="messageHistory">
                {selectedMessages.map((msg) => {
                  const isMe = msg.sender._id === currentUser._id;
                  return (
                    <div className="messageLine" key={msg._id}>
                      <span className={isMe ? 'messageSenderMe' : 'messageSenderThem'}>
                        {isMe ? 'Me' : 'Them'}:
                      </span>{' '}
                      {msg.content}
                    </div>
                  );
                })}
              </div>

              <div className="inputRow">
                <input
                  className="chatInput"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                />
                <button onClick={handleSendMessage}>Send</button>
              </div>
              <button onClick={handleDeleteMessages} style={{ marginTop: '10px' }}>
                Delete Messages
              </button>
            </>
          ) : (
            <p>Select (or start) a chat to see messages.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;


