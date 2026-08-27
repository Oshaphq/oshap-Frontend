import BankAccountsSection from "../../components/BankAccountsSection";
import { useAuth } from "../../context/AuthContext";

/**
 * Where transfers go.
 *
 * Its own screen rather than the fifth block down a long General page. It is
 * the setting a guest's money depends on, and it was the one furthest from the
 * top — below the cover photo.
 */
export default function BankSettings() {
  const { user } = useAuth();
  return <BankAccountsSection canEdit={user?.role === "OWNER"} />;
}
