import { useTranslation } from "react-i18next";

import { useAuth } from "../auth/AuthContext";

export function HomePage() {
  const { t } = useTranslation("common");
  const { user, logout } = useAuth();

  return (
    <>
      <h1>{t("home.title")}</h1>
      <p>{t("home.sessionActive")}</p>
      <p>
        {t("home.signedInAs")}{" "}
        <strong>{user?.email ?? t("home.unknownUser")}</strong>
      </p>
      <p>
        {t("home.provider")}: {user?.providerId ?? "email/password"}
      </p>
      <button type="button" onClick={logout}>
        {t("home.logout")}
      </button>
    </>
  );
}
