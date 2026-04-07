import { useAuth } from '../context/AuthContext';
import { LogOut, X } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { session, signOut } = useAuth();

  if (!isOpen) return null;

  const user = session?.user;
  const name = user?.user_metadata?.name || user?.email || 'User';
  const email = user?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url;

  const handleLogout = async () => {
    await signOut();
    onClose();
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Modal sheet - bottom aligned */}
      <div
        className={`fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white rounded-t-3xl shadow-lg z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Header with close button */}
        <div className="flex justify-end p-4 border-b border-gray-100">
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center space-y-4">
          {/* Avatar */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-16 h-16 rounded-full border-2 border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-600">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Name */}
          <h2 className="text-xl font-bold text-gray-800">{name}</h2>

          {/* Email */}
          {email && (
            <p className="text-sm text-gray-500">{email}</p>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full mt-6 py-3 bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors active:scale-95"
          >
            <LogOut size={18} />
            로그아웃
          </button>
        </div>

        {/* Bottom padding for mobile safety */}
        <div className="h-6" />
      </div>
    </>
  );
}
