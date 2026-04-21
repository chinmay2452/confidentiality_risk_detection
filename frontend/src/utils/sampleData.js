// Use this structure to simulate backend Rule Engine responses
export const sampleRuleEngineResponses = {
  total_risks: 5,
  risks: [
    {
      ruleId: "R_CONF_01",
      riskName: "Unencrypted Database Connection",
      affectedComponent: "DatabaseConnector",
      sourceModule: "BackendAPI",
      destinationModule: "UserDatabase",
      sensitivityLevel: "Critical",
      exposureType: "Internal only",
      roleAccess: "Internal employee",
      description: "Database connection passes unencrypted over the internal network.",
      timestamp: new Date().toISOString()
    },
    {
      ruleId: "R_CONF_05",
      riskName: "Publicly Exposed PII",
      affectedComponent: "UserProfileEndpoint",
      sourceModule: "PublicRouter",
      destinationModule: "ProfileService",
      sensitivityLevel: "Critical",
      exposureType: "Public endpoint",
      roleAccess: "Anonymous user",
      affectedModulesCount: 6,
      description: "PII is returned without authentication on a public endpoint.",
      timestamp: new Date().toISOString()
    },
    {
      ruleId: "R_CONF_08",
      riskName: "Cross-Module Logging of Secrets",
      affectedComponent: "AuthLogger",
      sourceModule: "AuthService",
      destinationModule: "LogAggregator",
      sensitivityLevel: "Confidential",
      exposureType: "Cross-module",
      roleAccess: "Internal employee",
      description: "Authentication tokens are logged in plain text.",
      timestamp: new Date().toISOString()
    },
    {
      ruleId: "R_CONF_12",
      riskName: "Over-permissive Admin Access",
      affectedComponent: "AdminDashboard",
      sourceModule: "DashboardUIArea",
      destinationModule: "AdminPanelBackend",
      sensitivityLevel: "Internal",
      exposureType: "Internal only",
      roleAccess: "Authenticated admin",
      description: "Admin panel uses basic auth instead of modern SSO.",
      timestamp: new Date().toISOString()
    },
    {
      ruleId: "R_CONF_15",
      riskName: "Third-party Tracker on Payment Page",
      affectedComponent: "PaymentGatewayRenderer",
      sourceModule: "CheckoutPage",
      destinationModule: "ExternalTracker",
      sensitivityLevel: "Critical",
      exposureType: "External API",
      roleAccess: "Multiple roles",
      description: "Payment data may leak via a third-party analytics script.",
      timestamp: new Date().toISOString()
    }
  ]
};
