// Full mock data for MAKSUM (VK Clone) - Social network with content

export const mockUser = {
  id: 1,
  name: "Иван Петров",
  firstName: "Иван",
  lastName: "Петров",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  coverPhoto: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=300&fit=crop",
  status: "В сети",
  bio: "Разработчик • Любитель путешествий • Фотограф",
  location: "Москва, Россия",
  birthDate: "15 мая 1995",
  followers: 1247,
  following: 389,
  posts: 156,
  isOnline: true,
  lastSeen: new Date().toISOString()
};

// Friends data
export const mockFriends = [
  {
    id: 2,
    name: "Анна Смирнова",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    status: "В сети",
    mutualFriends: 24,
    isOnline: true
  },
  {
    id: 3,
    name: "Дмитрий Козлов",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    status: "был(а) в сети 5 минут назад",
    mutualFriends: 18,
    isOnline: false
  },
  {
    id: 4,
    name: "Мария Иванова",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    status: "В сети",
    mutualFriends: 31,
    isOnline: true
  },
  {
    id: 5,
    name: "Алексей Новиков",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    status: "был(а) в сети 2 часа назад",
    mutualFriends: 12,
    isOnline: false
  },
  {
    id: 6,
    name: "Елена Петрова",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    status: "В сети",
    mutualFriends: 45,
    isOnline: true
  },
  {
    id: 7,
    name: "Сергей Волков",
    avatar: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=150&h=150&fit=crop&crop=face",
    status: "был(а) в сети час назад",
    mutualFriends: 8,
    isOnline: false
  },
  {
    id: 8,
    name: "Ольга Соколова",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    status: "В сети",
    mutualFriends: 19,
    isOnline: true
  }
];

// Posts data
export const mockPosts = [
  {
    id: 1,
    author: {
      id: 2,
      name: "Анна Смирнова",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
    },
    content: "Прекрасный закат над городом! 🌅 Не могла не запечатлеть этот момент. Природа вдохновляет на новые свершения.",
    images: ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop"],
    timestamp: "2 часа назад",
    likes: 124,
    comments: 23,
    shares: 8,
    liked: false
  },
  {
    id: 2,
    author: {
      id: 3,
      name: "Дмитрий Козлов",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
    },
    content: "Только что закончил новый проект! Было много интересных задач и вызовов. Спасибо команде за отличную работу! 💻✨",
    images: [],
    timestamp: "5 часов назад",
    likes: 89,
    comments: 12,
    shares: 5,
    liked: true
  },
  {
    id: 3,
    author: {
      id: 4,
      name: "Мария Иванова",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    },
    content: "Выходные в горах - это именно то, что нужно для перезагрузки! 🏔️ Свежий воздух, потрясающие виды и хорошая компания.",
    images: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop"
    ],
    timestamp: "вчера в 18:30",
    likes: 156,
    comments: 34,
    shares: 12,
    liked: false
  },
  {
    id: 4,
    author: {
      id: 5,
      name: "Алексей Новиков",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face"
    },
    content: "Рекомендую прочитать эту книгу всем, кто интересуется саморазвитием. Много полезных инсайтов и практических советов! 📚",
    images: ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&h=600&fit=crop"],
    timestamp: "вчера в 14:20",
    likes: 67,
    comments: 9,
    shares: 3,
    liked: false
  },
  {
    id: 5,
    author: {
      id: 6,
      name: "Елена Петрова",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
    },
    content: "Утро начинается с кофе и хорошей музыки! ☕🎵 Что вы слушаете сегодня?",
    images: [],
    timestamp: "2 дня назад",
    likes: 203,
    comments: 45,
    shares: 18,
    liked: true
  }
];

// Messages data
export const mockMessages = [
  {
    id: 1,
    user: {
      id: 2,
      name: "Анна Смирнова",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
      isOnline: true
    },
    lastMessage: "Спасибо за лайк на моей фотографии!",
    timestamp: "10 минут назад",
    unread: 2,
    messages: [
      {
        id: 1,
        senderId: 2,
        receiverId: 1,
        content: "Привет! Как дела?",
        timestamp: "вчера в 15:30",
        isRead: true
      },
      {
        id: 2,
        senderId: 1,
        receiverId: 2,
        content: "Привет! Всё отлично, спасибо. А у тебя?",
        timestamp: "вчера в 15:35",
        isRead: true
      },
      {
        id: 3,
        senderId: 2,
        receiverId: 1,
        content: "Тоже хорошо! Завтра встречаемся?",
        timestamp: "вчера в 15:40",
        isRead: true
      },
      {
        id: 4,
        senderId: 2,
        receiverId: 1,
        content: "Спасибо за лайк на моей фотографии!",
        timestamp: "10 минут назад",
        isRead: false
      }
    ]
  },
  {
    id: 2,
    user: {
      id: 3,
      name: "Дмитрий Козлов",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      isOnline: false
    },
    lastMessage: "Давай обсудим новый проект",
    timestamp: "2 часа назад",
    unread: 0,
    messages: [
      {
        id: 1,
        senderId: 3,
        receiverId: 1,
        content: "Привет! Есть минутка для обсуждения проекта?",
        timestamp: "вчера в 20:15",
        isRead: true
      },
      {
        id: 2,
        senderId: 1,
        receiverId: 3,
        content: "Конечно, что нужно обсудить?",
        timestamp: "вчера в 20:20",
        isRead: true
      },
      {
        id: 3,
        senderId: 3,
        receiverId: 1,
        content: "Давай обсудим новый проект",
        timestamp: "2 часа назад",
        isRead: true
      }
    ]
  },
  {
    id: 3,
    user: {
      id: 4,
      name: "Мария Иванова",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      isOnline: true
    },
    lastMessage: "Отличные фотографии с гор!",
    timestamp: "5 часов назад",
    unread: 1,
    messages: [
      {
        id: 1,
        senderId: 4,
        receiverId: 1,
        content: "Привет! Как тебе мои новые фотографии?",
        timestamp: "вчера в 19:00",
        isRead: true
      },
      {
        id: 2,
        senderId: 1,
        receiverId: 4,
        content: "Очень круто! Особенно понравился закат",
        timestamp: "вчера в 19:10",
        isRead: true
      },
      {
        id: 3,
        senderId: 4,
        receiverId: 1,
        content: "Отличные фотографии с гор!",
        timestamp: "5 часов назад",
        isRead: false
      }
    ]
  }
];

// Groups data
export const mockGroups = [
  {
    id: 1,
    name: "Путешествия и приключения",
    avatar: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=150&h=150&fit=crop",
    members: 15420,
    description: "Сообщество любителей путешествий"
  },
  {
    id: 2,
    name: "Программирование",
    avatar: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=150&h=150&fit=crop",
    members: 8730,
    description: "Обмен опытом и знаниями"
  },
  {
    id: 3,
    name: "Фотография",
    avatar: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=150&h=150&fit=crop",
    members: 11200,
    description: "Лучшие кадры и техники"
  }
];

// Notifications data
export const mockNotifications = [
  {
    id: 1,
    type: "like",
    user: {
      id: 2,
      name: "Анна Смирнова",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
    },
    content: "поставил(а) вам лайк",
    target: "ваша запись",
    timestamp: "5 минут назад",
    isRead: false
  },
  {
    id: 2,
    type: "comment",
    user: {
      id: 3,
      name: "Дмитрий Козлов",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
    },
    content: "оставил(а) комментарий",
    target: "к вашей записи",
    timestamp: "1 час назад",
    isRead: false
  },
  {
    id: 3,
    type: "friend",
    user: {
      id: 4,
      name: "Мария Иванова",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    },
    content: "отправил(а) вам заявку в друзья",
    target: "",
    timestamp: "3 часа назад",
    isRead: true
  },
  {
    id: 4,
    type: "like",
    user: {
      id: 5,
      name: "Алексей Новиков",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face"
    },
    content: "и ещё 12 человек поставили лайк",
    target: "вашей записи",
    timestamp: "5 часов назад",
    isRead: false
  },
  {
    id: 5,
    type: "share",
    user: {
      id: 6,
      name: "Елена Петрова",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
    },
    content: "поделился(лась) вашей записью",
    target: "",
    timestamp: "вчера",
    isRead: true
  }
];

// Helper functions for user operations
export const mockLikePost = (postId) => {
  const post = mockPosts.find(p => p.id === postId);
  if (post) {
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
  }
  return post;
};

export const mockAddComment = (postId, comment) => {
  const post = mockPosts.find(p => p.id === postId);
  if (post) {
    post.comments += 1;
  }
  return comment;
};

export const mockCreatePost = (content, images = []) => {
  const newPost = {
    id: mockPosts.length + 1,
    author: mockUser,
    content,
    images,
    timestamp: "Только что",
    likes: 0,
    comments: 0,
    shares: 0,
    liked: false
  };
  mockPosts.unshift(newPost);
  return newPost;
};

export const mockSendMessage = (receiverId, content) => {
  const newMessage = {
    id: Date.now(),
    senderId: mockUser.id,
    receiverId,
    content,
    timestamp: new Date().toISOString(),
    isRead: false
  };
  return newMessage;
};

export const mockAddFriend = (friendData) => {
  mockFriends.push({
    id: Date.now(),
    ...friendData,
    mutualFriends: 0,
    isOnline: false
  });
};

// Music integration placeholder
export const mockMusicData = {
  currentTrack: null,
  playlist: [],
  isPlaying: false,
  volume: 50
};