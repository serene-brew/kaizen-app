import { Redirect, Stack, router, usePathname } from "expo-router"; // Import usePathname
import { StatusBar } from "expo-status-bar";
import { Loader } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";
import { useEffect } from "react"; // Import useEffect

const AuthLayout = () => {
  const { loading, isLogged } = useGlobalContext();
  const pathname = usePathname(); // Get current path using the hook
  console.log(`AuthLayout Render: path=${pathname}, loading=${loading}, isLogged=${isLogged}`);

  // Use useEffect to handle redirection after state update
  useEffect(() => {
    console.log(`AuthLayout useEffect: path=${pathname}, loading=${loading}, isLogged=${isLogged}`);

    // If loading is finished and the user is logged in, redirect away from auth screens
    if (!loading && isLogged) {
      console.log("AuthLayout useEffect: User is logged in, redirecting to /(tabs)/explore...");
      // Use replace to prevent going back to the auth screen
      router.replace("/(tabs)/explore");
    }
    // No need to check the current path here, if isLogged is true, we always want to redirect away from AuthLayout
  }, [loading, isLogged]); // Depend only on loading and isLogged

  // If loading is finished and user is logged in, render nothing (or Redirect) while useEffect triggers navigation
  if (!loading && isLogged) {
     console.log("AuthLayout: Rendering null while redirecting...");
     return null; // Or <Redirect href="/(tabs)/explore" />; useEffect should handle it
  }

  // If loading or not logged in, render the auth stack
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {/* Show loader only when loading is true */}
      <Loader isLoading={loading} />
      <StatusBar backgroundColor="#161622" style="light" />
    </>
  );
};

export default AuthLayout;