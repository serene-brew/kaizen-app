import { Text, View, Alert } from "react-native";
import { router } from "expo-router";
import { CustomButton } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";
import { styles } from "../../styles/more.styles";

export default function More() {
  const { deleteAccount, logout } = useGlobalContext();

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace("/");
            } catch (error) {
              console.error('Delete account error:', error);
              Alert.alert(
                "Error", 
                "Failed to delete account. Please try again."
              );
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/");
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>More Page</Text>
      
      {/* Logout Button */}
      <CustomButton
        title="Logout"
        handlePress={handleLogout}
        containerStyles={styles.logoutButton}
      />

      {/* Existing Delete Account Button */}
      <CustomButton
        title="Delete Account"
        handlePress={handleDeleteAccount}
        containerStyles={styles.deleteButton}
      />
    </View>
  );
}
