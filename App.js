import "./global.css";
import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./screens/LoginScreen";
import SendMailScreen from "./screens/SendMailScreen";
import Dashboard from "./screens/Dashboard ";
import MailScreen from "./screens/MailScreen";
import AIFileScanScreen from "./screens/AIFileScanScreen";
import ProfileScreen from "./screens/ProfileScreen";
import SettingsScreen from "./screens/SettingsScreen";

import { storage } from "./function/storage";

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuth, setIsAuth] = React.useState(null);

  React.useEffect(() => {
    const loadAuth = async () => {
      const val = await storage.get("isAuth"); // ✅ FIX
      console.log("isAuth value:", val);

      setIsAuth(val === true || val === "true");
    };

    loadAuth();
  }, []);

  // ⛔ WAIT UNTIL STORAGE LOADS
  if (isAuth === null) return null;

  // 🌐 LINKING (FIXED)
  const linking = {
    prefixes: ["http://localhost:8081"],
    config: {
      screens: {
        Login: "login",
        Dashboard: "dashboard",
        Inbox: "inbox",
        SendMail: "sendmail",
        Threats: "threats",
        AI_scan: "ai-scan",
        Profile: "profile",
        Settings: "settings",
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}
        initialRouteName={isAuth ? "Dashboard" : "Login"}>

        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Dashboard" component={Dashboard} />
          <Stack.Screen name="SendMail" component={SendMailScreen} />
          <Stack.Screen name="Inbox" component={MailScreen} />
          <Stack.Screen name="Threats" component={MailScreen} />
          <Stack.Screen name="AI_scan" component={AIFileScanScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>

      </Stack.Navigator>
    </NavigationContainer>
  );
}