// Auth Helper Script
// Run this in browser console to set authentication token

function setAuthToken() {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzdXBlcmFkbWluQGVkdXNjYW4uYWkiLCJleHAiOjE3NDkzOTM4NjAsImlhdCI6MTc0OTM5MDI2MCwicm9sZXMiOlsiQURNSU4iXSwianRpIjoiMmMyYWQ3NWUtNDI0Mi00ZTQzLTgwMzgtYjkwZmNjOWIyN2ZkIiwidHlwZSI6ImFjY2VzcyIsInVzZXJfaWQiOjF9.YwFnFoLUII-ObDldr5JGKJeR-mJn94kSEPbrfarcsM0";
  
  // Set cookie for localhost:3000
  document.cookie = `access_token=${token}; path=/; domain=localhost; SameSite=Lax`;
  
  console.log("✅ Auth token set successfully!");
  console.log("Token expires:", new Date(1749393860 * 1000).toLocaleString());
  
  // Verify token is set
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('access_token='));
  
  if (tokenCookie) {
    console.log("✅ Token verified in cookies");
    return true;
  } else {
    console.error("❌ Failed to set token");
    return false;
  }
}

// Auto-run when script is loaded
if (typeof window !== 'undefined') {
  console.log("🔑 EduScan Auth Helper Loaded");
  console.log("Run setAuthToken() to authenticate");
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setAuthToken };
} 