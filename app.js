"use strict";

/*
 BANKLE DDI NIG LTD
 Offline-first business management system
 Part 1: Storage, helpers, navigation and dashboard foundation
*/

const BANKLE = {
  version: 1,
  storageKey: "bankle_enterprise_data_v1",

  data: {
    business: {
      name: "BANKLE DDI NIG LTD",
      phone: "",
      address: ""
    },
    products: [],
    sales: [],
    customers: [],
    suppliers: [],
    purchases: [],
    deliveries: [],
    expenses: [],
    staff: [],
    payments: [],
    activity: []
  }
};

function bankleToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function bankleId(prefix = "REC") {
  return prefix + "-" + Date.now().toString(36) +
    "-" + Math.random().toString(36).slice(2, 8);
}

function bankleMoney(value) {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2
  }).format(number);
}

function bankleNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function bankleText(value) {
  return String(value ?? "").trim();
}

function bankleEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (character) {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return replacements[character];
  });
}

function bankleLoad() {
  try {
    const saved = localStorage.getItem(BANKLE.storageKey);

    if (!saved) {
      return false;
    }

    const parsed = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object" || !parsed.data) {
      throw new Error("Saved data has an invalid format.");
    }

    const expectedLists = [
      "products",
      "sales",
      "customers",
      "suppliers",
      "purchases",
      "deliveries",
      "expenses",
      "staff",
      "payments",
      "activity"
    ];

    expectedLists.forEach(function (key) {
      if (!Array.isArray(parsed.data[key])) {
        parsed.data[key] = [];
      }
    });

    BANKLE.data = {
      ...BANKLE.data,
      ...parsed.data,
      business: {
        ...BANKLE.data.business,
        ...(parsed.data.business || {})
      }
    };

    return true;
  } catch (error) {
    console.error("BANKLE could not load saved data:", error);
    alert(
      "BANKLE could not read its saved records. " +
      "Do not clear browser storage. Check the saved backup before continuing."
    );
    return false;
  }
}

function bankleSave() {
  try {
    const packageToSave = {
      app: "BANKLE DDI NIG LTD Enterprise System",
      version: BANKLE.version,
      savedAt: new Date().toISOString(),
      data: BANKLE.data
    };

    localStorage.setItem(
      BANKLE.storageKey,
      JSON.stringify(packageToSave)
    );

    return true;
  } catch (error) {
    console.error("BANKLE could not save:", error);

    alert(
      "Saving failed. Your browser storage may be full or unavailable. " +
      "Export a backup if possible and do not close the page until checked."
    );

    return false;
  }
}

function bankleLog(message) {
  BANKLE.data.activity.unshift({
    id: bankleId("ACT"),
    message: bankleText(message),
    date: new Date().toISOString()
  });

  BANKLE.data.activity = BANKLE.data.activity.slice(0, 200);
}

function bankleSetText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function bankleSetHTML(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.innerHTML = value;
  }
}

function bankleShowEmpty(id, message) {
  bankleSetHTML(
    id,
    `<tr><td colspan="10" class="empty-state">${
      bankleEscape(message)
    }</td></tr>`
  );
}

function bankleShowPage(pageName) {
  document.querySelectorAll(".page").forEach(function (page) {
    page.classList.remove("active");
  });

  document.querySelectorAll("[data-page]").forEach(function (button) {
    button.classList.remove("active");
  });

  const target = document.getElementById(pageName);

  if (target) {
    target.classList.add("active");
  }

  const button = document.querySelector(
    `[data-page="${CSS.escape(pageName)}"]`
  );

  if (button) {
    button.classList.add("active");
  }
}

function bankleRenderActivity() {
  const container = document.getElementById("recentActivity");

  if (!container) {
    return;
  }

  if (!BANKLE.data.activity.length) {
    container.innerHTML =
      '<p class="empty-state">Your business activity will appear here.</p>';
    return;
  }

  container.innerHTML = BANKLE.data.activity
    .slice(0, 10)
    .map(function (item) {
      const time = item.date
        ? new Date(item.date).toLocaleString()
        : "";

      return `
        <div class="list-item">
          <div>
            <strong>${bankleEscape(item.message)}</strong>
            <small>${bankleEscape(time)}</small>
          </div>
        </div>
      `;
    })
    .join("");
}

function bankleCalculateCustomerDebt(customerId) {
  const customer = BANKLE.data.customers.find(function (item) {
    return item.id === customerId;
  });

  if (!customer) {
    return 0;
  }

  const salesDebt = BANKLE.data.sales
    .filter(function (sale) {
      return sale.customerId === customerId;
    })
    .reduce(function (total, sale) {
      return total + Math.max(
        0,
        bankleNumber(sale.total) - bankleNumber(sale.paid)
      );
    }, 0);

  const recordedPayments = BANKLE.data.payments
    .filter(function (payment) {
      return payment.customerId === customerId;
    })
    .reduce(function (total, payment) {
      return total + bankleNumber(payment.amount);
    }, 0);

  return Math.max(0, salesDebt - recordedPayments);
}

function bankleCalculateTotalDebt() {
  return BANKLE.data.customers.reduce(function (total, customer) {
    return total + bankleCalculateCustomerDebt(customer.id);
  }, 0);
}

function bankleRenderDashboard() {
  const today = bankleToday();

  const todaySales = BANKLE.data.sales
    .filter(function (sale) {
      return sale.date === today;
    })
    .reduce(function (total, sale) {
      return total + bankleNumber(sale.total);
    }, 0);

  const todayPayments = BANKLE.data.payments
    .filter(function (payment) {
      return payment.date === today;
    })
    .reduce(function (total, payment) {
      return total + bankleNumber(payment.amount);
    }, 0);

  const todayExpenses = BANKLE.data.expenses
    .filter(function (expense) {
      return expense.date === today;
    })
    .reduce(function (total, expense) {
      return total + bankleNumber(expense.amount);
    }, 0);

  bankleSetText("todaySales", bankleMoney(todaySales));
  bankleSetText("todayPayments", bankleMoney(todayPayments));
  bankleSetText("totalDebt", bankleMoney(bankleCalculateTotalDebt()));
  bankleSetText("todayExpenses", bankleMoney(todayExpenses));

  bankleRenderActivity();
}

function bankleRefresh() {
  bankleRenderDashboard();
}
/* =========================================
   PART 2: INVENTORY, CUSTOMERS AND SUPPLIERS
========================================= */

function bankleFormValue(form, name) {
  const field = form.elements.namedItem(name);
  return field ? bankleText(field.value) : "";
}

function bankleFormNumber(form, name) {
  const field = form.elements.namedItem(name);
  return field ? bankleNumber(field.value) : 0;
}

function bankleRenderInventory() {
  const rows = document.getElementById("inventoryRows");
  if (!rows) return;

  if (!BANKLE.data.products.length) {
    bankleShowEmpty("inventoryRows", "No products added yet.");
    return;
  }

  rows.innerHTML = BANKLE.data.products.map(function (product) {
    const quantity = bankleNumber(product.qty);
    const low = quantity <= bankleNumber(product.lowStock);

    return `
      <tr>
        <td>${bankleEscape(product.name)}</td>
        <td>${bankleEscape(product.unit || "Crate")}</td>
        <td>
          <span class="badge ${low ? "badge-warning" : "badge-success"}">
            ${quantity}
          </span>
        </td>
        <td>${bankleMoney(product.cost)}</td>
        <td>${bankleMoney(product.price)}</td>
        <td>${bankleMoney(quantity * bankleNumber(product.cost))}</td>
      </tr>
    `;
  }).join("");
}

function bankleRenderCustomers() {
  const rows = document.getElementById("customerRows");
  if (!rows) return;

  if (!BANKLE.data.customers.length) {
    bankleShowEmpty("customerRows", "No customers added yet.");
    return;
  }

  rows.innerHTML = BANKLE.data.customers.map(function (customer) {
    const debt = bankleCalculateCustomerDebt(customer.id);

    return `
      <tr>
        <td>${bankleEscape(customer.name)}</td>
        <td>${bankleEscape(customer.phone || "—")}</td>
        <td>${bankleEscape(customer.address || "—")}</td>
        <td>${bankleMoney(debt)}</td>
      </tr>
    `;
  }).join("");
}

function bankleRenderSuppliers() {
  const list = document.getElementById("supplierList");
  if (!list) return;

  if (!BANKLE.data.suppliers.length) {
    list.innerHTML =
      '<p class="empty-state">No suppliers added yet.</p>';
    return;
  }

  list.innerHTML = BANKLE.data.suppliers.map(function (supplier) {
    return `
      <div class="list-item">
        <div>
          <strong>${bankleEscape(supplier.name)}</strong>
          <small>
            Phone: ${bankleEscape(supplier.phone || "Not provided")}<br>
            Address: ${bankleEscape(supplier.address || "Not provided")}
          </small>
        </div>
      </div>
    `;
  }).join("");
}

function bankleRefreshSelectors() {
  const productSelectors = [
    document.getElementById("saleProduct"),
    document.getElementById("purchaseProduct")
  ];

  productSelectors.forEach(function (select) {
    if (!select) return;

    const previous = select.value;

    select.innerHTML =
      '<option value="">Choose a product</option>' +
      BANKLE.data.products.map(function (product) {
        return `
          <option value="${bankleEscape(product.id)}">
            ${bankleEscape(product.name)} — Stock: ${bankleNumber(product.qty)}
          </option>
        `;
      }).join("");

    if (BANKLE.data.products.some(function (product) {
      return product.id === previous;
    })) {
      select.value = previous;
    }
  });

  const customerSelectors = [
    document.getElementById("saleCustomer"),
    document.getElementById("deliveryCustomer")
  ];

  customerSelectors.forEach(function (select) {
    if (!select) return;

    const previous = select.value;

    select.innerHTML =
      '<option value="">Choose a customer</option>' +
      BANKLE.data.customers.map(function (customer) {
        return `
          <option value="${bankleEscape(customer.id)}">
            ${bankleEscape(customer.name)}
          </option>
        `;
      }).join("");

    if (BANKLE.data.customers.some(function (customer) {
      return customer.id === previous;
    })) {
      select.value = previous;
    }
  });

  const supplierSelect = document.getElementById("purchaseSupplier");

  if (supplierSelect) {
    const previous = supplierSelect.value;

    supplierSelect.innerHTML =
      '<option value="">Choose a supplier</option>' +
      BANKLE.data.suppliers.map(function (supplier) {
        return `
          <option value="${bankleEscape(supplier.id)}">
            ${bankleEscape(supplier.name)}
          </option>
        `;
      }).join("");

    if (BANKLE.data.suppliers.some(function (supplier) {
      return supplier.id === previous;
    })) {
      supplierSelect.value = previous;
    }
  }
}

function bankleAddProduct(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const name = bankleFormValue(form, "name");
  const unit = bankleFormValue(form, "unit") || "Crate";
  const qty = bankleFormNumber(form, "qty");
  const cost = bankleFormNumber(form, "cost");
  const price = bankleFormNumber(form, "price");
  const lowStock = bankleFormNumber(form, "lowStock");

  if (!name) {
    alert("Enter the product name.");
    return;
  }

  if (qty < 0 || cost < 0 || price < 0 || lowStock < 0) {
    alert("Stock and prices cannot be negative.");
    return;
  }

  BANKLE.data.products.push({
    id: bankleId("PROD"),
    name: name,
    unit: unit,
    qty: qty,
    cost: cost,
    price: price,
    lowStock: lowStock,
    createdAt: new Date().toISOString()
  });

  bankleLog("Added product: " + name);

  if (!bankleSave()) return;

  form.reset();
  bankleRenderInventory();
  bankleRefreshSelectors();
  bankleRenderDashboard();

  alert("Product saved successfully.");
}

function bankleAddCustomer(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const name = bankleFormValue(form, "name");
  const phone = bankleFormValue(form, "phone");
  const address = bankleFormValue(form, "address");

  if (!name) {
    alert("Enter the customer's name.");
    return;
  }

  BANKLE.data.customers.push({
    id: bankleId("CUST"),
    name: name,
    phone: phone,
    address: address,
    createdAt: new Date().toISOString()
  });

  bankleLog("Added customer: " + name);

  if (!bankleSave()) return;

  form.reset();
  bankleRenderCustomers();
  bankleRefreshSelectors();
  bankleRenderDashboard();

  alert("Customer saved successfully.");
}

function bankleAddSupplier(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const name = bankleFormValue(form, "name");
  const phone = bankleFormValue(form, "phone");
  const address = bankleFormValue(form, "address");

  if (!name) {
    alert("Enter the supplier's name.");
    return;
  }

  BANKLE.data.suppliers.push({
    id: bankleId("SUP"),
    name: name,
    phone: phone,
    address: address,
    createdAt: new Date().toISOString()
  });

  bankleLog("Added supplier: " + name);

  if (!bankleSave()) return;

  form.reset();
  bankleRenderSuppliers();
  bankleRefreshSelectors();

  alert("Supplier saved successfully.");
}

function bankleConnectPart2() {
  const productForm = document.getElementById("productForm");
  const customerForm = document.getElementById("customerForm");
  const supplierForm = document.getElementById("supplierForm");

  if (productForm) {
    productForm.addEventListener("submit", bankleAddProduct);
  }

  if (customerForm) {
    customerForm.addEventListener("submit", bankleAddCustomer);
  }

  if (supplierForm) {
    supplierForm.addEventListener("submit", bankleAddSupplier);
  }
}
/* =========================================
   PART 3: SALES AND STOCK PURCHASES
========================================= */

function bankleGetField(form, names) {
  for (const name of names) {
    const field = form.elements.namedItem(name);

    if (field) return field;
  }

  return null;
}

function bankleGetValue(form, names) {
  const field = bankleGetField(form, names);
  return field ? bankleText(field.value) : "";
}

function bankleGetNumber(form, names) {
  const field = bankleGetField(form, names);
  return field ? bankleNumber(field.value) : 0;
}

function bankleRenderSales() {
  const rows = document.getElementById("salesRows");
  if (!rows) return;

  if (!BANKLE.data.sales.length) {
    bankleShowEmpty("salesRows", "No sales recorded yet.");
    return;
  }

  rows.innerHTML = BANKLE.data.sales.slice().reverse().map(function (sale) {
    const customer = BANKLE.data.customers.find(
      item => item.id === sale.customerId
    );

    const product = BANKLE.data.products.find(
      item => item.id === sale.productId
    );

    const outstanding = Math.max(
      0,
      bankleNumber(sale.total) - bankleNumber(sale.paid)
    );

    return `
      <tr>
        <td>${bankleEscape(sale.date)}</td>
        <td>${bankleEscape(customer ? customer.name : "Walk-in customer")}</td>
        <td>${bankleEscape(product ? product.name : "Product unavailable")}</td>
        <td>${bankleNumber(sale.qty)}</td>
        <td>${bankleMoney(sale.total)}</td>
        <td>${bankleMoney(sale.paid)}</td>
        <td>${bankleMoney(outstanding)}</td>
      </tr>
    `;
  }).join("");
}

function bankleAddSale(event) {
  event.preventDefault();

  const form = event.currentTarget;

  const customerId = bankleGetValue(form, ["customerId", "customer"]);
  const productId = bankleGetValue(form, ["productId", "product"]);
  const qty = bankleGetNumber(form, ["qty", "quantity"]);
  const price = bankleGetNumber(form, ["price", "unitPrice"]);
  const paid = bankleGetNumber(form, ["paid", "amountPaid"]);
  const method = bankleGetValue(form, ["method", "paymentMethod"]) || "Cash";

  const product = BANKLE.data.products.find(
    item => item.id === productId
  );

  if (!product) {
    alert("Please select a valid product.");
    return;
  }

  if (customerId && !BANKLE.data.customers.some(
    item => item.id === customerId
  )) {
    alert("Please select a valid customer.");
    return;
  }

  if (qty <= 0) {
    alert("Quantity must be greater than zero.");
    return;
  }

  if (qty > bankleNumber(product.qty)) {
    alert("Not enough stock. Available stock: " + product.qty);
    return;
  }

  if (price < 0 || paid < 0) {
    alert("Price and payment cannot be negative.");
    return;
  }

  const total = qty * price;

  if (paid > total) {
    alert("Payment cannot be greater than the sale total.");
    return;
  }

  product.qty = bankleNumber(product.qty) - qty;

  const sale = {
    id: bankleId("SALE"),
    date: bankleToday(),
    createdAt: new Date().toISOString(),
    customerId: customerId,
    productId: productId,
    qty: qty,
    price: price,
    total: total,
    paid: paid,
    method: method,
    costAtSale: bankleNumber(product.cost)
  };

  BANKLE.data.sales.push(sale);

  if (customerId && paid > 0) {
    BANKLE.data.payments.push({
      id: bankleId("PAY"),
      customerId: customerId,
      saleId: sale.id,
      amount: paid,
      date: bankleToday(),
      method: method,
      type: "Sale payment"
    });
  }

  const customer = BANKLE.data.customers.find(
    item => item.id === customerId
  );

  bankleLog(
    "Recorded sale of " + qty + " " + product.unit +
    " of " + product.name +
    (customer ? " to " + customer.name : "")
  );

  if (!bankleSave()) {
    product.qty = bankleNumber(product.qty) + qty;
    BANKLE.data.sales.pop();

    if (customerId && paid > 0) {
      BANKLE.data.payments.pop();
    }

    BANKLE.data.activity.shift();
    return;
  }

  form.reset();

  bankleRenderSales();
  bankleRenderInventory();
  bankleRenderCustomers();
  bankleRefreshSelectors();
  bankleRefresh();

  alert(
    "Sale saved.\n" +
    "Total: " + bankleMoney(total) + "\n" +
    "Paid: " + bankleMoney(paid) + "\n" +
    "Outstanding: " + bankleMoney(total - paid)
  );
}

function bankleRenderPurchases() {
  const list = document.getElementById("purchaseList");
  if (!list) return;

  if (!BANKLE.data.purchases.length) {
    list.innerHTML =
      '<p class="empty-state">No stock purchases recorded yet.</p>';
    return;
  }

  list.innerHTML = BANKLE.data.purchases.slice().reverse().map(
    function (purchase) {
      const product = BANKLE.data.products.find(
        item => item.id === purchase.productId
      );

      const supplier = BANKLE.data.suppliers.find(
        item => item.id === purchase.supplierId
      );

      return `
        <div class="list-item">
          <div>
            <strong>${bankleEscape(product ? product.name : "Product")}</strong>
            <small>
              Date: ${bankleEscape(purchase.date)}<br>
              Supplier: ${bankleEscape(supplier ? supplier.name : "Unknown")}<br>
              Quantity received: ${bankleNumber(purchase.qty)}<br>
              Unit cost: ${bankleMoney(purchase.cost)}<br>
              Purchase total: ${bankleMoney(purchase.total)}
            </small>
          </div>
        </div>
      `;
    }
  ).join("");
}

function bankleAddPurchase(event) {
  event.preventDefault();

  const form = event.currentTarget;

  const supplierId = bankleGetValue(form, ["supplierId", "supplier"]);
  const productId = bankleGetValue(form, ["productId", "product"]);
  const qty = bankleGetNumber(form, ["qty", "quantity"]);
  const cost = bankleGetNumber(form, ["cost", "unitCost"]);

  const product = BANKLE.data.products.find(
    item => item.id === productId
  );

  if (!product) {
    alert("Please select a valid product.");
    return;
  }

  if (supplierId && !BANKLE.data.suppliers.some(
    item => item.id === supplierId
  )) {
    alert("Please select a valid supplier.");
    return;
  }

  if (qty <= 0 || cost < 0) {
    alert("Enter a valid quantity and cost.");
    return;
  }

  const oldQty = bankleNumber(product.qty);
  const oldCost = bankleNumber(product.cost);
  const newQty = oldQty + qty;

  product.cost = newQty > 0
    ? ((oldQty * oldCost) + (qty * cost)) / newQty
    : cost;

  product.qty = newQty;

  BANKLE.data.purchases.push({
    id: bankleId("PUR"),
    date: bankleToday(),
    createdAt: new Date().toISOString(),
    supplierId: supplierId,
    productId: productId,
    qty: qty,
    cost: cost,
    total: qty * cost
  });

  bankleLog(
    "Received " + qty + " " + product.unit +
    " of " + product.name
  );

  if (!bankleSave()) {
    product.qty = oldQty;
    product.cost = oldCost;
    BANKLE.data.purchases.pop();
    BANKLE.data.activity.shift();
    return;
  }

  form.reset();

  bankleRenderInventory();
  bankleRenderPurchases();
  bankleRefreshSelectors();
  bankleRefresh();

  alert("Stock purchase saved successfully.");
}

function bankleConnectPart3() {
  const saleForm = document.getElementById("saleForm");
  const purchaseForm = document.getElementById("purchaseForm");

  if (saleForm) {
    saleForm.addEventListener("submit", bankleAddSale);
  }

  if (purchaseForm) {
    purchaseForm.addEventListener("submit", bankleAddPurchase);
  }
}
/* =========================================
   PART 4: PAYMENTS, EXPENSES, DELIVERIES,
   AND STAFF
========================================= */

/* CUSTOMER DEBT PAYMENTS */

function bankleCalculateCustomerDebt(customerId) {
  const salesOutstanding = BANKLE.data.sales
    .filter(sale => sale.customerId === customerId)
    .reduce(function (total, sale) {
      return total + Math.max(
        0,
        bankleNumber(sale.total) - bankleNumber(sale.paid)
      );
    }, 0);

  const debtPayments = BANKLE.data.payments
    .filter(function (payment) {
      return payment.customerId === customerId &&
        payment.type === "Debt payment";
    })
    .reduce(function (total, payment) {
      return total + bankleNumber(payment.amount);
    }, 0);

  return Math.max(0, salesOutstanding - debtPayments);
}

function bankleRecordDebtPayment(customerId) {
  const customer = BANKLE.data.customers.find(
    item => item.id === customerId
  );

  if (!customer) {
    alert("Customer not found.");
    return;
  }

  const debt = bankleCalculateCustomerDebt(customerId);

  if (debt <= 0) {
    alert("This customer has no outstanding debt.");
    return;
  }

  const input = prompt(
    "Customer: " + customer.name +
    "\nOutstanding debt: " + bankleMoney(debt) +
    "\n\nEnter the amount received:"
  );

  if (input === null) return;

  const amount = Number(input);

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Enter a valid payment amount.");
    return;
  }

  if (amount > debt) {
    alert("Payment cannot exceed the outstanding debt.");
    return;
  }

  const method = prompt(
    "Payment method:\nEnter Cash, Transfer, or POS.",
    "Cash"
  );

  if (method === null) return;

  const payment = {
    id: bankleId("PAY"),
    customerId: customerId,
    amount: amount,
    date: bankleToday(),
    method: bankleText(method) || "Cash",
    type: "Debt payment",
    createdAt: new Date().toISOString()
  };

  BANKLE.data.payments.push(payment);
  bankleLog(
    "Received debt payment of " +
    bankleMoney(amount) + " from " + customer.name
  );

  if (!bankleSave()) {
    BANKLE.data.payments.pop();
    BANKLE.data.activity.shift();
    return;
  }

  bankleRenderCustomers();
  bankleRenderDashboard();

  alert(
    "Payment recorded successfully.\n" +
    "Amount received: " + bankleMoney(amount) + "\n" +
    "Remaining debt: " +
    bankleMoney(bankleCalculateCustomerDebt(customerId))
  );
}

/* UPDATED CUSTOMER TABLE WITH PAYMENT BUTTON */

function bankleRenderCustomers() {
  const rows = document.getElementById("customerRows");
  if (!rows) return;

  if (!BANKLE.data.customers.length) {
    bankleShowEmpty("customerRows", "No customers added yet.");
    return;
  }

  rows.innerHTML = BANKLE.data.customers.map(function (customer) {
    const debt = bankleCalculateCustomerDebt(customer.id);

    return `
      <tr>
        <td>${bankleEscape(customer.name)}</td>
        <td>${bankleEscape(customer.phone || "—")}</td>
        <td>${bankleEscape(customer.address || "—")}</td>
        <td>${bankleMoney(debt)}</td>
        <td>
          <button
            type="button"
            class="btn btn-primary btn-small"
            onclick="bankleRecordDebtPayment('${bankleEscape(customer.id)}')">
            Record Payment
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

/* EXPENSES */

function bankleRenderExpenses() {
  const list = document.getElementById("expenseList");
  if (!list) return;

  if (!BANKLE.data.expenses.length) {
    list.innerHTML =
      '<p class="empty-state">No expenses recorded yet.</p>';
    return;
  }

  list.innerHTML = BANKLE.data.expenses.slice().reverse().map(
    function (expense) {
      return `
        <div class="list-item">
          <div>
            <strong>${bankleEscape(expense.category)}</strong>
            <small>
              Date: ${bankleEscape(expense.date)}<br>
              Amount: ${bankleMoney(expense.amount)}<br>
              Details: ${bankleEscape(expense.note || "None")}
            </small>
          </div>
        </div>
      `;
    }
  ).join("");
}

function bankleAddExpense(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const category = bankleGetValue(form, ["category"]);
  const amount = bankleGetNumber(form, ["amount"]);
  const date = bankleGetValue(form, ["date"]) || bankleToday();
  const note = bankleGetValue(form, ["note"]);

  if (!category) {
    alert("Enter the expense category.");
    return;
  }

  if (amount <= 0) {
    alert("Expense amount must be greater than zero.");
    return;
  }

  const expense = {
    id: bankleId("EXP"),
    category: category,
    amount: amount,
    date: date,
    note: note,
    createdAt: new Date().toISOString()
  };

  BANKLE.data.expenses.push(expense);
  bankleLog("Recorded expense: " + category);

  if (!bankleSave()) {
    BANKLE.data.expenses.pop();
    BANKLE.data.activity.shift();
    return;
  }

  form.reset();

  const dateField = form.elements.namedItem("date");
  if (dateField) dateField.value = bankleToday();

  bankleRenderExpenses();
  bankleRenderDashboard();

  alert("Expense saved successfully.");
}

/* DELIVERIES */

function bankleRenderDeliveries() {
  const list = document.getElementById("deliveryList");
  if (!list) return;

  if (!BANKLE.data.deliveries.length) {
    list.innerHTML =
      '<p class="empty-state">No deliveries recorded yet.</p>';
    return;
  }

  list.innerHTML = BANKLE.data.deliveries.slice().reverse().map(
    function (delivery) {
      const customer = BANKLE.data.customers.find(
        item => item.id === delivery.customerId
      );

      return `
        <div class="list-item">
          <div>
            <strong>${bankleEscape(
              customer ? customer.name : "Customer not specified"
            )}</strong>
            <small>
              Date: ${bankleEscape(delivery.date)}<br>
              Driver: ${bankleEscape(delivery.driver || "Not assigned")}<br>
              Details: ${bankleEscape(delivery.details || "None")}<br>
              Status: ${bankleEscape(delivery.status)}<br>
              Delivery cost: ${bankleMoney(delivery.cost)}
            </small>
          </div>
        </div>
      `;
    }
  ).join("");
}

function bankleAddDelivery(event) {
  event.preventDefault();

  const form = event.currentTarget;

  const customerId = bankleGetValue(form, ["customer", "customerId"]);
  const driver = bankleGetValue(form, ["driver"]);
  const details = bankleGetValue(form, ["details"]);
  const status = bankleGetValue(form, ["status"]) || "Pending";
  const cost = bankleGetNumber(form, ["cost"]);

  if (customerId && !BANKLE.data.customers.some(
    item => item.id === customerId
  )) {
    alert("Please select a valid customer.");
    return;
  }

  if (cost < 0) {
    alert("Delivery cost cannot be negative.");
    return;
  }

  const delivery = {
    id: bankleId("DEL"),
    customerId: customerId,
    driver: driver,
    details: details,
    status: status,
    cost: cost,
    date: bankleToday(),
    createdAt: new Date().toISOString()
  };

  BANKLE.data.deliveries.push(delivery);
  bankleLog("Created a delivery record.");

  if (!bankleSave()) {
    BANKLE.data.deliveries.pop();
    BANKLE.data.activity.shift();
    return;
  }

  form.reset();
  bankleRenderDeliveries();

  alert("Delivery record saved.");
}

/* STAFF */

function bankleRenderStaff() {
  const list = document.getElementById("staffList");
  if (!list) return;

  if (!BANKLE.data.staff.length) {
    list.innerHTML =
      '<p class="empty-state">No staff records added yet.</p>';
    return;
  }

  list.innerHTML = BANKLE.data.staff.map(function (member) {
    return `
      <div class="list-item">
        <div>
          <strong>${bankleEscape(member.name)}</strong>
          <small>
            Role: ${bankleEscape(member.role)}<br>
            Phone: ${bankleEscape(member.phone || "Not provided")}
          </small>
        </div>
      </div>
    `;
  }).join("");
}

function bankleAddStaff(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const name = bankleGetValue(form, ["name"]);
  const role = bankleGetValue(form, ["role"]);
  const phone = bankleGetValue(form, ["phone"]);

  if (!name || !role) {
    alert("Enter the staff member's name and role.");
    return;
  }

  BANKLE.data.staff.push({
    id: bankleId("STAFF"),
    name: name,
    role: role,
    phone: phone,
    createdAt: new Date().toISOString()
  });

  bankleLog("Added staff member: " + name);

  if (!bankleSave()) {
    BANKLE.data.staff.pop();
    BANKLE.data.activity.shift();
    return;
  }

  form.reset();
  bankleRenderStaff();

  alert("Staff record saved.");
}

/* CONNECT PART 4 FORMS */

function bankleConnectPart4() {
  const expenseForm = document.getElementById("expenseForm");
  const deliveryForm = document.getElementById("deliveryForm");
  const staffForm = document.getElementById("staffForm");

  if (expenseForm) {
    expenseForm.addEventListener("submit", bankleAddExpense);
  }

  if (deliveryForm) {
    deliveryForm.addEventListener("submit", bankleAddDelivery);
  }

  if (staffForm) {
    staffForm.addEventListener("submit", bankleAddStaff);
  }
}
/* =========================================
   PART 5: FINANCIAL REPORTS
========================================= */

function bankleRenderReport() {
  const output = document.getElementById("reportOutput");
  if (!output) return;

  const startField = document.getElementById("reportStart");
  const endField = document.getElementById("reportEnd");

  const start = startField ? startField.value : "";
  const end = endField ? endField.value : "";

  if (start && end && start > end) {
    output.innerHTML =
      '<div class="notice notice-warning">The start date must be before the end date.</div>';
    return;
  }

  function inRange(record) {
    const date = record.date || "";

    if (start && date < start) return false;
    if (end && date > end) return false;

    return true;
  }

  const sales = BANKLE.data.sales.filter(inRange);
  const expenses = BANKLE.data.expenses.filter(inRange);
  const purchases = BANKLE.data.purchases.filter(inRange);
  const payments = BANKLE.data.payments.filter(inRange);

  const salesTotal = sales.reduce(
    (sum, item) => sum + bankleNumber(item.total), 0
  );

  const salesPaid = sales.reduce(
    (sum, item) => sum + bankleNumber(item.paid), 0
  );

  const salesOutstanding = sales.reduce(
    (sum, item) => sum + Math.max(
      0,
      bankleNumber(item.total) - bankleNumber(item.paid)
    ), 0
  );

  const debtPayments = payments
    .filter(item => item.type === "Debt payment")
    .reduce((sum, item) => sum + bankleNumber(item.amount), 0);

  const expensesTotal = expenses.reduce(
    (sum, item) => sum + bankleNumber(item.amount), 0
  );

  const purchasesTotal = purchases.reduce(
    (sum, item) => sum + bankleNumber(item.total), 0
  );

  const costOfGoodsSold = sales.reduce(
    (sum, sale) => sum +
      (bankleNumber(sale.costAtSale) * bankleNumber(sale.qty)), 0
  );

  const grossProfit = salesTotal - costOfGoodsSold;
  const estimatedNetProfit = grossProfit - expensesTotal;

  const totalPaymentsReceived = salesPaid + debtPayments;

  output.innerHTML = `
    <h2> BANKLE DDI NIG LTD </h2>
    <p><strong>Financial Report</strong></p>
    <p>
      Period:
      ${bankleEscape(start || "Beginning")}
      to
      ${bankleEscape(end || "Today")}
    </p>

    <div class="report-summary">
      <div>
        <small>Total sales</small>
        <strong>${bankleMoney(salesTotal)}</strong>
      </div>
      <div>
        <small>Payments received</small>
        <strong>${bankleMoney(totalPaymentsReceived)}</strong>
      </div>
      <div>
        <small>Outstanding from sales in period</small>
        <strong>${bankleMoney(salesOutstanding)}</strong>
      </div>
      <div>
        <small>Cost of goods sold (estimated)</small>
        <strong>${bankleMoney(costOfGoodsSold)}</strong>
      </div>
      <div>
        <small>Gross profit (estimated)</small>
        <strong>${bankleMoney(grossProfit)}</strong>
      </div>
      <div>
        <small>Expenses</small>
        <strong>${bankleMoney(expensesTotal)}</strong>
      </div>
      <div>
        <small>Estimated net profit</small>
        <strong>${bankleMoney(estimatedNetProfit)}</strong>
      </div>
      <div>
        <small>Stock purchases</small>
        <strong>${bankleMoney(purchasesTotal)}</strong>
      </div>
      <div>
        <small>Sales transactions</small>
        <strong>${sales.length}</strong>
      </div>
    </div>

    <div class="notice notice-warning">
      These figures are estimates. The report depends on accurate records.
      Stock purchases are shown separately and are not subtracted again from
      estimated profit because the cost of goods sold is already included.
      Confirm the results against your business records before making decisions.
    </div>

    <h3>Sales breakdown</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>Product</th>
            <th>Quantity</th>
            <th>Total</th>
            <th>Paid at sale</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          ${
            sales.length
              ? sales.map(function (sale) {
                  const customer = BANKLE.data.customers.find(
                    item => item.id === sale.customerId
                  );
                  const product = BANKLE.data.products.find(
                    item => item.id === sale.productId
                  );

                  return `
                    <tr>
                      <td>${bankleEscape(sale.date)}</td>
                      <td>${bankleEscape(customer ? customer.name : "Walk-in")}</td>
                      <td>${bankleEscape(product ? product.name : "Unknown")}</td>
                      <td>${bankleNumber(sale.qty)}</td>
                      <td>${bankleMoney(sale.total)}</td>
                      <td>${bankleMoney(sale.paid)}</td>
                      <td>${bankleMoney(
                        Math.max(0, bankleNumber(sale.total) -
                        bankleNumber(sale.paid))
                      )}</td>
                    </tr>
                  `;
                }).join("")
              : '<tr><td colspan="7">No sales for this period.</td></tr>'
          }
        </tbody>
      </table>
    </div>

    <h3>Expense breakdown</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Details</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
            expenses.length
              ? expenses.map(function (expense) {
                  return `
                    <tr>
                      <td>${bankleEscape(expense.date)}</td>
                      <td>${bankleEscape(expense.category)}</td>
                      <td>${bankleEscape(expense.note || "—")}</td>
                      <td>${bankleMoney(expense.amount)}</td>
                    </tr>
                  `;
                }).join("")
              : '<tr><td colspan="4">No expenses for this period.</td></tr>'
          }
        </tbody>
      </table>
    </div>
  `;
}

function bankleExportReportCSV() {
  const startField = document.getElementById("reportStart");
  const endField = document.getElementById("reportEnd");

  const start = startField ? startField.value : "";
  const end = endField ? endField.value : "";

  if (start && end && start > end) {
    alert("The start date must be before the end date.");
    return;
  }

  function inRange(record) {
    return (!start || record.date >= start) &&
      (!end || record.date <= end);
  }

  const rows = [
    ["BANKLE DDI NIG LTD — Financial Report"],
    ["Start date", start || "Beginning"],
    ["End date", end || "Today"],
    [],
    ["Sales"],
    ["Date", "Customer", "Product", "Quantity", "Total", "Paid", "Balance"]
  ];

  BANKLE.data.sales.filter(inRange).forEach(function (sale) {
    const customer = BANKLE.data.customers.find(
      item => item.id === sale.customerId
    );
    const product = BANKLE.data.products.find(
      item => item.id === sale.productId
    );

    rows.push([
      sale.date,
      customer ? customer.name : "Walk-in customer",
      product ? product.name : "Unknown product",
      sale.qty,
      sale.total,
      sale.paid,
      Math.max(0, bankleNumber(sale.total) - bankleNumber(sale.paid))
    ]);
  });

  rows.push([]);
  rows.push(["Expenses"]);
  rows.push(["Date", "Category", "Details", "Amount"]);

  BANKLE.data.expenses.filter(inRange).forEach(function (expense) {
    rows.push([
      expense.date,
      expense.category,
      expense.note || "",
      expense.amount
    ]);
  });

  const csv = rows.map(function (row) {
    return row.map(function (value) {
      const textValue = String(value ?? "");
      return '"' + textValue.replace(/"/g, '""') + '"';
    }).join(",");
  }).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "BANKLE-Financial-Report-" + bankleToday() + ".csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function bankleConnectPart5() {
  const generateButton = document.getElementById("generateReport");
  const printButton = document.getElementById("printReport");
  const exportButton = document.getElementById("exportReport");

  if (generateButton) {
    generateButton.addEventListener("click", bankleRenderReport);
  }

  if (printButton) {
    printButton.addEventListener("click", function () {
      bankleRenderReport();
      window.print();
    });
  }

  if (exportButton) {
    exportButton.addEventListener("click", bankleExportReportCSV);
  }
}
/* =========================================
   PART 6: SETTINGS, BACKUP, NAVIGATION
   AND APPLICATION STARTUP
========================================= */

/* BUSINESS SETTINGS */

function bankleLoadBusinessSettings() {
  const business = BANKLE.data.business || {};

  const nameField = document.getElementById("businessName");
  const phoneField = document.getElementById("businessPhone");
  const addressField = document.getElementById("businessAddress");

  if (nameField) nameField.value = business.name || "BANKLE DDI NIG LTD";
  if (phoneField) phoneField.value = business.phone || "";
  if (addressField) addressField.value = business.address || "";
}

function bankleSaveBusinessSettings(event) {
  event.preventDefault();

  const form = event.currentTarget;

  const nameField = document.getElementById("businessName");
  const phoneField = document.getElementById("businessPhone");
  const addressField = document.getElementById("businessAddress");

  const name = nameField
    ? bankleText(nameField.value)
    : bankleText(form.elements.namedItem("name")?.value);

  const phone = phoneField
    ? bankleText(phoneField.value)
    : bankleText(form.elements.namedItem("phone")?.value);

  const address = addressField
    ? bankleText(addressField.value)
    : bankleText(form.elements.namedItem("address")?.value);

  if (!name) {
    alert("Enter your business name.");
    return;
  }

  const previous = { ...BANKLE.data.business };

  BANKLE.data.business = {
    name: name,
    phone: phone,
    address: address
  };

  bankleLog("Updated business settings.");

  if (!bankleSave()) {
    BANKLE.data.business = previous;
    BANKLE.data.activity.shift();
    return;
  }

  const heading = document.querySelector(".brand h1");

  if (heading) {
    heading.textContent = name;
  }

  alert("Business settings saved.");
}

/* BACKUP */

function bankleCreateBackup() {
  const backup = {
    app: "BANKLE DDI NIG LTD Enterprise System",
    version: BANKLE.version,
    exportedAt: new Date().toISOString(),
    data: BANKLE.data
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "BANKLE-Backup-" + bankleToday() + ".json";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);

  const status = document.getElementById("backupStatus");

  if (status) {
    status.textContent =
      "Backup export requested. Check your Downloads folder.";
  }
}

function bankleRestoreBackup(event) {
  const file = event.target.files && event.target.files[0];

  if (!file) return;

  if (!confirm(
    "Restoring a backup will replace the records currently open in this app. " +
    "Export a backup of your current records first if you need them. Continue?"
  )) {
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = function () {
    try {
      const backup = JSON.parse(reader.result);

      if (
        !backup ||
        !backup.data ||
        backup.app !== "BANKLE DDI NIG LTD Enterprise System"
      ) {
        throw new Error("This is not a recognized BANKLE backup.");
      }

      const requiredLists = [
        "products",
        "sales",
        "customers",
        "suppliers",
        "purchases",
        "deliveries",
        "expenses",
        "staff",
        "payments",
        "activity"
      ];

      for (const key of requiredLists) {
        if (!Array.isArray(backup.data[key])) {
          throw new Error("Backup is missing valid records: " + key);
        }
      }

      if (
        !backup.data.business ||
        typeof backup.data.business !== "object"
      ) {
        throw new Error("Backup business settings are invalid.");
      }

      const oldData = BANKLE.data;

      BANKLE.data = {
        business: {
          name: bankleText(backup.data.business.name) ||
            "BANKLE DDI NIG LTD",
          phone: bankleText(backup.data.business.phone),
          address: bankleText(backup.data.business.address)
        }
      };

      requiredLists.forEach(function (key) {
        BANKLE.data[key] = backup.data[key];
      });

      if (!bankleSave()) {
        BANKLE.data = oldData;
        throw new Error("Could not save the restored records.");
      }

      bankleLoadBusinessSettings();
      bankleRenderAll();

      const status = document.getElementById("backupStatus");

      if (status) {
        status.textContent = "Backup restored successfully.";
      }

      alert("Backup restored successfully.");
    } catch (error) {
      console.error("Backup restoration failed:", error);

      alert(
        "The backup could not be restored. " +
        "Your file may be invalid or incompatible.\n\n" +
        error.message
      );
    }

    event.target.value = "";
  };

  reader.onerror = function () {
    alert("The backup file could not be read.");
    event.target.value = "";
  };

  reader.readAsText(file);
}

/* NAVIGATION */

function bankleConnectNavigation() {
  document.querySelectorAll("[data-page]").forEach(function (button) {
    button.addEventListener("click", function () {
      const pageName = button.getAttribute("data-page");

      if (pageName) {
        bankleShowPage(pageName);
      }
    });
  });
}

/* RENDER ALL SECTIONS */

function bankleRenderAll() {
  bankleRenderDashboard();
  bankleRenderInventory();
  bankleRenderSales();
  bankleRenderCustomers();
  bankleRenderSuppliers();
  bankleRenderPurchases();
  bankleRenderExpenses();
  bankleRenderDeliveries();
  bankleRenderStaff();
  bankleRefreshSelectors();
}

/* CONNECT SETTINGS AND BACKUP */

function bankleConnectPart6() {
  const businessForm = document.getElementById("businessForm");
  const backupButton = document.getElementById("backupButton");
  const restoreFile = document.getElementById("restoreFile");

  if (businessForm) {
    businessForm.addEventListener(
      "submit",
      bankleSaveBusinessSettings
    );
  }

  if (backupButton) {
    backupButton.addEventListener("click", bankleCreateBackup);
  }

  if (restoreFile) {
    restoreFile.addEventListener("change", bankleRestoreBackup);
  }
}

/* START APPLICATION */

function bankleStart() {
  bankleLoad();

  bankleConnectNavigation();
  bankleConnectPart2();
  bankleConnectPart3();
  bankleConnectPart4();
  bankleConnectPart5();
  bankleConnectPart6();

  bankleLoadBusinessSettings();
  bankleRenderAll();

  const expenseDate = document.querySelector(
    '#expenseForm [name="date"]'
  );

  if (expenseDate && !expenseDate.value) {
    expenseDate.value = bankleToday();
  }

  const firstPage = document.querySelector(".page.active");

  if (!firstPage) {
    const firstButton = document.querySelector("[data-page]");

    if (firstButton) {
      bankleShowPage(firstButton.getAttribute("data-page"));
    }
  }

  console.log("BANKLE Enterprise System initialized.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bankleStart);
} else {
  bankleStart();
}