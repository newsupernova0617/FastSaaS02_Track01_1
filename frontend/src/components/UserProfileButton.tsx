import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserProfileModal from './UserProfileModal';

export default function UserProfileButton() {
  const { session } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!session) return null;

  const user = session.user;
  const avatarUrl = user?.user_metadata?.avatar_url;
  const name = user?.user_metadata?.name || user?.email || 'User';

  return (
    <>
      {/* Avatar button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-gray-200 hover:border-gray-300 transition-colors active:scale-95"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-gray-600">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {/* Modal */}
      <UserProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
