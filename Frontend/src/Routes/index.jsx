import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";

import PageLoader from "../Components/Common/PageLoader";

const LoginPage = lazy(() => import("../Pages/Login/LoginPage"));
const RegisterPage = lazy(() => import("../Pages/Register/RegisterPage"));
const RationCategoryMaster = lazy(() => {
  return import("../Components/RationInventory/CategoryMaster/RationCategoryMaster");
});
const AddRationCategory = lazy(() => {
  return import("../Components/RationInventory/CategoryMaster/AddRationCategory");
});
const EditRationCategory = lazy(() => {
  return import("../Components/RationInventory/CategoryMaster/EditRationCategory");
});
const ViewRationCategory = lazy(() => {
  return import("../Components/RationInventory/CategoryMaster/ViewRationCategory");
});

const RationUnitMaster = lazy(() => {
  return import("../Components/RationInventory/UnitMaster/RationUnitMaster");
});
const AddRationUnit = lazy(() => {
  return import("../Components/RationInventory/UnitMaster/AddRationUnit");
});
const EditRationUnit = lazy(() => {
  return import("../Components/RationInventory/UnitMaster/EditRationUnit");
});
const ViewRationUnit = lazy(() => {
  return import("../Components/RationInventory/UnitMaster/ViewRationUnit");
});

const RationItemMaster = lazy(() => {
  return import("../Components/RationInventory/ItemMaster/RationItemMaster");
});
const AddRationItem = lazy(() => {
  return import("../Components/RationInventory/ItemMaster/AddRationItem");
});
const EditRationItem = lazy(() => {
  return import("../Components/RationInventory/ItemMaster/EditRationItem");
});
const ViewRationItem = lazy(() => {
  return import("../Components/RationInventory/ItemMaster/ViewRationItem");
});

const RationSupplierMaster = lazy(() => {
  return import("../Components/RationInventory/SupplierMaster/RationSupplierMaster");
});
const AddRationSupplier = lazy(() => {
  return import("../Components/RationInventory/SupplierMaster/AddRationSupplier");
});
const EditRationSupplier = lazy(() => {
  return import("../Components/RationInventory/SupplierMaster/EditRationSupplier");
});
const ViewRationSupplier = lazy(() => {
  return import("../Components/RationInventory/SupplierMaster/ViewRationSupplier");
});

const RationPurchaseDashboard = lazy(() => {
  return import("../Components/RationInventory/Purchase/RationPurchaseDashboard");
});
const AddRationPurchase = lazy(() => {
  return import("../Components/RationInventory/Purchase/AddRationPurchase");
});
const EditRationPurchase = lazy(() => {
  return import("../Components/RationInventory/Purchase/EditRationPurchase");
});
const ViewRationPurchase = lazy(() => {
  return import("../Components/RationInventory/Purchase/ViewRationPurchase");
});
const RationPurchaseHistory = lazy(() => {
  return import("../Components/RationInventory/Purchase/RationPurchaseHistory");
});

const RationCurrentStock = lazy(() => {
  return import("../Components/RationInventory/CurrentStock/RationCurrentStock");
});
const ViewRationCurrentStock = lazy(() => {
  return import("../Components/RationInventory/CurrentStock/ViewRationCurrentStock");
});
const RationStockTransactionHistory = lazy(() => {
  return import("../Components/RationInventory/CurrentStock/RationStockTransactionHistory");
});

const KitchenRequest = lazy(() => {
  return import("../Components/RationInventory/KitchenRequest/KitchenRequest");
});
const AddKitchenRequest = lazy(() => {
  return import("../Components/RationInventory/KitchenRequest/AddKitchenRequest");
});
const EditKitchenRequest = lazy(() => {
  return import("../Components/RationInventory/KitchenRequest/EditKitchenRequest");
});
const ViewKitchenRequest = lazy(() => {
  return import("../Components/RationInventory/KitchenRequest/ViewKitchenRequest");
});

const RationStockIssue = lazy(() => {
  return import("../Components/RationInventory/StockIssue/RationStockIssue");
});
const AddRationStockIssue = lazy(() => {
  return import("../Components/RationInventory/StockIssue/AddRationStockIssue");
});
const ViewRationStockIssue = lazy(() => {
  return import("../Components/RationInventory/StockIssue/ViewRationStockIssue");
});

const RationStockAdjustment = lazy(() => {
  return import("../Components/RationInventory/StockAdjustment/RationStockAdjustment");
});
const AddRationStockAdjustment = lazy(() => {
  return import("../Components/RationInventory/StockAdjustment/AddRationStockAdjustment");
});
const ViewRationStockAdjustment = lazy(() => {
  return import("../Components/RationInventory/StockAdjustment/ViewRationStockAdjustment");
});

const RationStockAudit = lazy(() => {
  return import("../Components/RationInventory/StockAudit/RationStockAudit");
});
const AddRationStockAudit = lazy(() => {
  return import("../Components/RationInventory/StockAudit/AddRationStockAudit");
});
const EditRationStockAudit = lazy(() => {
  return import("../Components/RationInventory/StockAudit/EditRationStockAudit");
});
const ViewRationStockAudit = lazy(() => {
  return import("../Components/RationInventory/StockAudit/ViewRationStockAudit");
});

const RationInventoryDashboard = lazy(() => {
  return import("../Components/RationInventory/InventoryDashboard/RationInventoryDashboard");
});
const RationQRLabels = lazy(() => {
  return import("../Components/RationInventory/QRLabels/RationQRLabels");
});
const RationReports = lazy(() => {
  return import("../Components/RationInventory/Reports/RationReports");
});
const RationBackup = lazy(() => {
  return import("../Components/RationInventory/Backup/RationBackup");
});
const RationSettings = lazy(() => {
  return import("../Components/RationInventory/Settings/RationSettings");
});

const withSuspense = (component) => {
  return (
    <Suspense fallback={<PageLoader />}>
      {component}
    </Suspense>
  );
};

export const loginRoute = withSuspense(<LoginPage />);

export const registerRoute = withSuspense(<RegisterPage />);

export const rationInventoryRoutes = [
  {
    path: "/ration-inventory/category-master",
    element: withSuspense(<RationCategoryMaster />),
  },
  {
    path: "/ration-inventory/category-master/add",
    element: withSuspense(<AddRationCategory />),
  },
  {
    path: "/ration-inventory/category-master/edit/:id",
    element: withSuspense(<EditRationCategory />),
  },
  {
    path: "/ration-inventory/category-master/view/:id",
    element: withSuspense(<ViewRationCategory />),
  },
  {
    path: "/ration-inventory/unit-master",
    element: withSuspense(<RationUnitMaster />),
  },
  {
    path: "/ration-inventory/unit-master/add",
    element: withSuspense(<AddRationUnit />),
  },
  {
    path: "/ration-inventory/unit-master/edit/:id",
    element: withSuspense(<EditRationUnit />),
  },
  {
    path: "/ration-inventory/unit-master/view/:id",
    element: withSuspense(<ViewRationUnit />),
  },
  {
    path: "/ration-inventory/item-master",
    element: withSuspense(<RationItemMaster />),
  },
  {
    path: "/ration-inventory/item-master/add",
    element: withSuspense(<AddRationItem />),
  },
  {
    path: "/ration-inventory/item-master/edit/:id",
    element: withSuspense(<EditRationItem />),
  },
  {
    path: "/ration-inventory/item-master/view/:id",
    element: withSuspense(<ViewRationItem />),
  },
  {
    path: "/ration-inventory/supplier-master",
    element: withSuspense(<RationSupplierMaster />),
  },
  {
    path: "/ration-inventory/supplier-master/add",
    element: withSuspense(<AddRationSupplier />),
  },
  {
    path: "/ration-inventory/supplier-master/edit/:id",
    element: withSuspense(<EditRationSupplier />),
  },
  {
    path: "/ration-inventory/supplier-master/view/:id",
    element: withSuspense(<ViewRationSupplier />),
  },
  {
    path: "/ration-inventory/purchases",
    element: withSuspense(<RationPurchaseDashboard />),
  },
  {
    path: "/ration-inventory/purchases/new",
    element: withSuspense(<AddRationPurchase />),
  },
  {
    path: "/ration-inventory/purchases/edit/:id",
    element: withSuspense(<EditRationPurchase />),
  },
  {
    path: "/ration-inventory/purchases/view/:id",
    element: withSuspense(<ViewRationPurchase />),
  },
  {
    path: "/ration-inventory/purchases/history",
    element: withSuspense(<RationPurchaseHistory />),
  },
  {
    path: "/ration-inventory/current-stock",
    element: withSuspense(<RationCurrentStock />),
  },
  {
    path: "/ration-inventory/current-stock/view/:id",
    element: withSuspense(<ViewRationCurrentStock />),
  },
  {
    path: "/ration-inventory/current-stock/history/:id",
    element: withSuspense(<RationStockTransactionHistory />),
  },
  {
    path: "/ration-inventory/kitchen-request",
    element: withSuspense(<KitchenRequest />),
  },
  {
    path: "/ration-inventory/kitchen-request/new",
    element: withSuspense(<AddKitchenRequest />),
  },
  {
    path: "/ration-inventory/kitchen-request/edit/:id",
    element: withSuspense(<EditKitchenRequest />),
  },
  {
    path: "/ration-inventory/kitchen-request/view/:id",
    element: withSuspense(<ViewKitchenRequest />),
  },
  {
    path: "/ration-inventory/stock-issue",
    element: withSuspense(<RationStockIssue />),
  },
  {
    path: "/ration-inventory/stock-issue/create/:requestId",
    element: withSuspense(<AddRationStockIssue />),
  },
  {
    path: "/ration-inventory/stock-issue/view/:id",
    element: withSuspense(<ViewRationStockIssue />),
  },
  {
    path: "/ration-inventory/stock-adjustment",
    element: withSuspense(<RationStockAdjustment />),
  },
  {
    path: "/ration-inventory/stock-adjustment/create",
    element: withSuspense(<AddRationStockAdjustment />),
  },
  {
    path: "/ration-inventory/stock-adjustment/view/:id",
    element: withSuspense(<ViewRationStockAdjustment />),
  },
  {
    path: "/ration-inventory/stock-audit",
    element: withSuspense(<RationStockAudit />),
  },
  {
    path: "/ration-inventory/stock-audit/create",
    element: withSuspense(<AddRationStockAudit />),
  },
  {
    path: "/ration-inventory/stock-audit/edit/:id",
    element: withSuspense(<EditRationStockAudit />),
  },
  {
    path: "/ration-inventory/stock-audit/view/:id",
    element: withSuspense(<ViewRationStockAudit />),
  },
  {
    path: "/ration-inventory/inventory-dashboard",
    element: withSuspense(<RationInventoryDashboard />),
  },
  {
    path: "/ration-inventory/qr-labels",
    element: withSuspense(<RationQRLabels />),
  },
  {
    path: "/ration-inventory/reports",
    element: withSuspense(<RationReports />),
  },
  {
    path: "/ration-inventory/backup",
    element: withSuspense(<RationBackup />),
  },
  {
    path: "/ration-inventory/settings",
    element: withSuspense(<RationSettings />),
  },
];

export const applicationRoutes = [
  {
    path: "/dashboard",
    element: <Navigate to="/ration-inventory/inventory-dashboard" replace />,
  },
  ...rationInventoryRoutes,
];
