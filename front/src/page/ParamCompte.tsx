import MainHeader from "../components/MainHeader/MainHeader";

import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";

export function ParamCompte() {
  const [serverError, setServerError] = useState(false);
  const [serverErrorMessage, setServerErrorMessage] = useState("");
  const navigate = useNavigate();

  type UserDataProfile = {
    email: string;
    nom: string;
    prenom?: string;
    role: "USER" | "ADMIN";
    isVerified: boolean;
  };

  const [userData, setUserData] = useState({} as UserDataProfile);

  let avatarUrl = null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/user/get", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        const dataResponse = await response.json();
        console.log("USER DATA :", dataResponse);
        if (!dataResponse.success && !dataResponse.data.profile.isVerified) {
          navigate("/inscription");
        } else if (!dataResponse.ok) {
          setServerError(true);
          setServerErrorMessage(dataResponse.message);
        } else if (
          dataResponse.success &&
          dataResponse.data.profile.isVerified
        ) {
          setUserData(dataResponse.data.profile);
          avatarUrl = dataResponse.data.provider.avatarUrl;
        }
      } catch (error) {
        console.error("🛑🛑🛑 ERREUR SERVEUR GET USER", error);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <MainHeader />
      <div>Parametre de compte</div>
    </>
  );
}
