import LogoutButton from "./LogoutButton";
import { useAuth } from './AuthContext';

export default function CurrentUser() {
  const { currentUser, logout } = useAuth();

  if (!currentUser) {
    return <div>No user logged in.</div>;
  }

  return (
    <div>
      <h1>Current User</h1>
      <p>Name: {currentUser.name}</p>
      <p>Email: {currentUser.email}</p>
      <p>Role: {currentUser.role}</p>
      <p>Phone: {currentUser.phone}</p>
      <p>Parent ID: {currentUser.parentId}</p>
      <p>Hierarchy: {JSON.stringify(currentUser.hierarchy)}</p>
      {currentUser && <LogoutButton onClick={logout} />}
    </div>
  );
}