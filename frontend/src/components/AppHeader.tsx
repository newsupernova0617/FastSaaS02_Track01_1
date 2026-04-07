import { useAuth } from '../context/AuthContext';
import UserProfileButton from './UserProfileButton';

export default function AppHeader() {
  const { session, loading } = useAuth();

  // Only show header when user is logged in
  if (loading || !session) return null;

  return (
    <header className="fixed top-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-b border-gray-100 z-40">
      <div className="flex justify-end items-center px-4 py-3">
        <UserProfileButton />
      </div>
    </header>
  );
}
