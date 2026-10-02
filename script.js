/* =========================
   script.js
    PrintHubASIET
   ========================= */

let currentStudent = null;
let currentPrintType = "BW";
let currentFilterStudent = "All";
let currentFilterStaff = "All";
let currentSearchStudent = "";
let currentSearchStaff = "";
let currentPendingOrder = null;

const ORDER_STORAGE_KEY = "asiet-print-hub-orders";

let orders = loadOrders();
let orderSequence = getNextOrderSequence();

const PRINT_PRICES = {
    BW: 1,
    Colour: 5
};

const FINISHING_SERVICES = {
    spiralBinding: {
        label: "Spiral Binding",
        amount: 40,
        group: "binding"
    },
    hardBinding: {
        label: "Hard Binding",
        amount: 50,
        group: "binding"
    },
    lamination: {
        label: "Lamination",
        amount: 35
    },
    idCard: {
        label: "ID Card Printing",
        amount: 25
    }
};

let selectedFinishingServices = new Set();

const STATUS = {
    QUEUED: "Queued",
    PRINTING: "Printing",
    READY: "Ready for Collection",
    COLLECTED: "Collected"
};

let toastTimeout;


/* =========================
   BASIC HELPERS
   ========================= */

function $(id) {
    return document.getElementById(id);
}

function loadOrders() {

    try {

        const savedOrders =
            localStorage.getItem(ORDER_STORAGE_KEY);

        const parsedOrders =
            savedOrders ? JSON.parse(savedOrders) : [];

        return Array.isArray(parsedOrders)
            ? parsedOrders
            : [];

    } catch {

        return [];

    }
}

function getNextOrderSequence() {

    return Math.max(
        1001,
        ...orders.map(order =>
            Number(String(order.id).replace(/^PQ-/, "")) + 1
        ).filter(Number.isFinite)
    );
}

function saveOrders() {

    try {

        localStorage.setItem(
            ORDER_STORAGE_KEY,
            JSON.stringify(orders)
        );

    } catch {

        showToast("Orders could not be saved on this device.");

    }
}

function money(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
}

function getDateTime() {
    return new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getTime() {
    return new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function getPages(order) {
    return Number(order.pages) * Number(order.copies);
}

function getOrder(orderId) {
    return orders.find(order => order.id === orderId);
}

function getStudentOrders() {
    if (!currentStudent) return [];

    return orders.filter(order =>
        order.reg.toLowerCase() === currentStudent.reg.toLowerCase()
    );
}

function totalRevenue() {
    return orders
        .filter(order => order.paymentStatus === "Paid")
        .reduce((total, order) => total + order.amount, 0);
}

function totalRequestedPages() {
    return orders.reduce(
        (total, order) => total + getPages(order),
        0
    );
}

function getETA(order) {

    const queuedBefore = orders.filter(other =>
        other.id !== order.id &&
        other.status !== STATUS.READY &&
        other.status !== STATUS.COLLECTED &&
        other.createdAt < order.createdAt
    ).length;

    const pageWork = getPages(order);

    const minimum =
        5 +
        queuedBefore * 4 +
        Math.ceil(pageWork / 10) * 2;

    return {
        minimum,
        maximum: minimum + 5,
        text: `About ${minimum}–${minimum + 5} min`
    };
}

function getStatusClass(status) {

    if (status === STATUS.PRINTING) {
        return "status-printing";
    }

    if (status === STATUS.READY) {
        return "status-ready";
    }

    if (status === STATUS.COLLECTED) {
        return "status-collected";
    }

    return "status-queued";
}

function getStatusLabel(status) {

    if (status === STATUS.READY) {
        return "Ready to Collect";
    }

    return status;
}

function showToast(message) {

    const toast = $("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function emptyState(title, description, icon = "▤") {

    return `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <h3>${escapeHTML(title)}</h3>
            <p>${escapeHTML(description)}</p>
        </div>
    `;
}


/* =========================
   LOGIN TABS
   ========================= */

document.querySelectorAll(".portal-tab").forEach(button => {

    button.addEventListener("click", () => {

        const portal = button.dataset.portal;

        document.querySelectorAll(".portal-tab")
            .forEach(tab => {
                tab.classList.toggle(
                    "active",
                    tab === button
                );
            });

        $("studentLoginForm")
            .classList.toggle(
                "hidden",
                portal !== "student"
            );

        $("staffLoginForm")
            .classList.toggle(
                "hidden",
                portal !== "staff"
            );
    });

});


/* =========================
   STUDENT LOGIN
   ========================= */

$("studentLoginForm").addEventListener(
    "submit",
    event => {

        event.preventDefault();

        const reg =
            $("studentReg").value.trim();

        const name =
            $("studentName").value.trim();

        const batch =
            $("studentBatch").value;

        const course =
            $("studentCourse").value;

        if (!name || !reg || !batch || !course) {

            showToast(
                "Please complete all student details."
            );

            return;
        }

        currentStudent = {

            reg,

            batch,

            course,

            name

        };

        $("loginPage")
            .classList.add("hidden");

        $("studentPage")
            .classList.remove("hidden");

        $("staffPage")
            .classList.add("hidden");

        updateStudentProfile();

        studentNavigate("home");

        refreshAllPortals();

        showToast(
            `Welcome, ${currentStudent.name}!`
        );
    }
);


function updateStudentProfile() {

    if (!currentStudent) return;

    $("studentHeaderName")
        .textContent =
        currentStudent.name;

    $("studentHeaderReg")
        .textContent =
        currentStudent.reg;

    $("studentAvatar")
        .textContent =
        currentStudent.name
            .charAt(0)
            .toUpperCase();

    $("studentProfileName")
        .textContent =
        currentStudent.name;

    $("studentGreetingName")
        .textContent =
        currentStudent.name;

    $("studentProfileReg")
        .textContent =
        currentStudent.reg;

    $("studentProfileCourse")
        .textContent =
        currentStudent.course;

    $("studentProfileBatch")
        .textContent =
        currentStudent.batch;
}


/* =========================
   STAFF LOGIN
   ========================= */

$("staffLoginForm").addEventListener(
    "submit",
    event => {

        event.preventDefault();

        const id =
            $("staffId").value.trim();

        const password =
            $("staffPassword").value;

        if (
            id !== "STAFF001" ||
            password !== "1234"
        ) {

            showToast(
                "Invalid staff login. Use STAFF001 / 1234."
            );

            return;
        }

        $("loginPage")
            .classList.add("hidden");

        $("studentPage")
            .classList.add("hidden");

        $("staffPage")
            .classList.remove("hidden");

        staffNavigate("dashboard");

        refreshAllPortals();

        showToast(
            "Welcome to the Print Shop."
        );
    }
);


/* =========================
   LOGOUT
   ========================= */

function logout() {

    $("studentPage")
        .classList.add("hidden");

    $("staffPage")
        .classList.add("hidden");

    $("loginPage")
        .classList.remove("hidden");

    closeModal("paymentModal");
    closeModal("confirmationModal");
    closeModal("qrModal");
    closeModal("staffReadyModal");

    currentPendingOrder = null;

    showToast("Logged out successfully.");
}


/* =========================
   STUDENT NAVIGATION
   ========================= */

document
    .querySelectorAll("[data-student-view]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                studentNavigate(
                    button.dataset.studentView
                );

            }
        );

    });


function studentNavigate(view) {

    const sections = {

        home: "studentHome",

        print: "studentPrint",

        orders: "studentOrders",

        staff: "studentStaff"

    };

    if (!sections[view]) return;

    Object.values(sections)
        .forEach(id => {

            $(id)
                .classList
                .add("hidden");

        });

    $(sections[view])
        .classList
        .remove("hidden");

    document
        .querySelectorAll("[data-student-view]")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.studentView === view
            );

        });

    if (view === "home") {
        renderStudentHome();
    }

    if (view === "orders") {
        renderStudentOrders();
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================
   STAFF NAVIGATION
   ========================= */

document
    .querySelectorAll("[data-staff-view]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                staffNavigate(
                    button.dataset.staffView
                );

            }
        );

    });


function staffNavigate(view) {

    const sections = {

        dashboard: "staffDashboard",

        orders: "staffOrders",

        finance: "staffFinance",

        reports: "staffReports"

    };

    if (!sections[view]) return;

    Object.values(sections)
        .forEach(id => {

            $(id)
                .classList
                .add("hidden");

        });

    $(sections[view])
        .classList
        .remove("hidden");

    document
        .querySelectorAll("[data-staff-view]")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.staffView === view
            );

        });

    if (view === "dashboard") {
        renderStaffDashboard();
    }

    if (view === "orders") {
        renderStaffOrders();
    }

    if (view === "finance") {
        renderFinance();
    }

    if (view === "reports") {
        renderReports();
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================
   PRINT TYPE
   ========================= */

document
    .querySelectorAll("[data-print-type]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                currentPrintType =
                    button.dataset.printType;

                document
                    .querySelectorAll("[data-print-type]")
                    .forEach(option => {

                        option.classList.toggle(
                            "selected",
                            option === button
                        );

                    });

                updatePriceSummary();

            }
        );

    });


/* =========================
   FILE UPLOAD
   ========================= */

const fileInput = $("printFile");
const uploadArea =
    document.querySelector(".upload-area");


fileInput.addEventListener(
    "change",
    updateSelectedFile
);


function updateSelectedFile() {

    const file =
        fileInput.files[0];

    if (!file) {

        $("uploadTitle")
            .textContent =
            "Drop your PDF here";

        $("uploadSubtitle")
            .textContent =
            "or click to browse your files";

        return;
    }

    if (
        file.type !== "application/pdf" &&
        !file.name
            .toLowerCase()
            .endsWith(".pdf")
    ) {

        fileInput.value = "";

        showToast(
            "Please select a PDF file."
        );

        updateSelectedFile();

        return;
    }

    if (
        file.size >
        30 * 1024 * 1024
    ) {

        fileInput.value = "";

        showToast(
            "PDF must be smaller than 30 MB."
        );

        updateSelectedFile();

        return;
    }

    $("uploadTitle")
        .textContent =
        "✓ " + file.name;

    $("uploadSubtitle")
        .textContent =
        `${(file.size / 1024 / 1024).toFixed(2)} MB · PDF selected`;

    updatePriceSummary();
}


["dragenter", "dragover"]
    .forEach(type => {

        uploadArea.addEventListener(
            type,
            event => {

                event.preventDefault();

                uploadArea
                    .classList
                    .add("dragging");

            }
        );

    });


["dragleave", "drop"]
    .forEach(type => {

        uploadArea.addEventListener(
            type,
            event => {

                event.preventDefault();

                uploadArea
                    .classList
                    .remove("dragging");

            }
        );

    });


uploadArea.addEventListener(
    "drop",
    event => {

        const file =
            event.dataTransfer.files[0];

        if (!file) return;

        if (
            file.type !==
            "application/pdf" &&
            !file.name
                .toLowerCase()
                .endsWith(".pdf")
        ) {

            showToast(
                "Please drop a PDF file."
            );

            return;
        }

        if (
            file.size >
            30 * 1024 * 1024
        ) {

            showToast(
                "PDF must be smaller than 30 MB."
            );

            return;
        }

        try {

            const transfer =
                new DataTransfer();

            transfer.items.add(file);

            fileInput.files =
                transfer.files;

            updateSelectedFile();

        } catch {

            showToast(
                "Please use the file browser."
            );

        }

    }
);


/* =========================
   PRICE
   ========================= */

$("printPages")
    .addEventListener(
        "input",
        updatePriceSummary
    );

$("printCopies")
    .addEventListener(
        "input",
        updatePriceSummary
    );


function getPrintInputs() {

    const pages = Math.max(
        1,
        Math.min(
            1000,
            parseInt(
                $("printPages").value
            ) || 1
        )
    );

    const copies = Math.max(
        1,
        Math.min(
            100,
            parseInt(
                $("printCopies").value
            ) || 1
        )
    );

    const rate =
        PRINT_PRICES[currentPrintType];

    const totalPages =
        pages * copies;

    const finishingServices =
        [...selectedFinishingServices].map(id => ({
            id,
            label: FINISHING_SERVICES[id].label,
            amount: FINISHING_SERVICES[id].amount
        }));

    const finishingAmount =
        finishingServices.reduce(
            (total, service) => total + service.amount,
            0
        );

    return {

        pages,

        copies,

        rate,

        totalPages,

        amount:
            totalPages * rate + finishingAmount,

        finishingAmount,

        finishingServices,

        type:
            currentPrintType

    };
}


function updatePriceSummary() {

    const data =
        getPrintInputs();

    $("summaryPrintType")
        .textContent =
        data.type === "BW"
            ? "Black & White"
            : "Colour";

    $("summaryPageCount")
        .textContent =
        `${data.pages} × ${data.copies} = ${data.totalPages}`;

    $("summaryRate")
        .textContent =
        money(data.rate);

    $("summaryFinishing")
        .textContent =
        data.finishingServices.length
            ? data.finishingServices
                .map(service => `${service.label} ${money(service.amount)}`)
                .join(", ")
            : "None";

    $("summaryAmount")
        .textContent =
        money(data.amount);

    const activeOrders =
        orders.filter(order =>
            order.status === STATUS.QUEUED ||
            order.status === STATUS.PRINTING
        ).length;

    const minimum =
        5 +
        activeOrders * 4 +
        Math.ceil(data.totalPages / 10) * 2;

    $("liveEstimate")
        .textContent =
        `About ${minimum}–${minimum + 5} min`;
}

document
    .querySelectorAll("[data-finishing-service]")
    .forEach(button => {

        button.addEventListener("click", () => {

            const serviceId = button.dataset.finishingService;
            const service = FINISHING_SERVICES[serviceId];

            if (!service) return;

            if (selectedFinishingServices.has(serviceId)) {
                selectedFinishingServices.delete(serviceId);
            } else {
                if (service.group) {
                    Object.entries(FINISHING_SERVICES)
                        .filter(([, option]) => option.group === service.group)
                        .forEach(([id]) => selectedFinishingServices.delete(id));
                }

                selectedFinishingServices.add(serviceId);
            }

            document
                .querySelectorAll("[data-finishing-service]")
                .forEach(option => {
                    const selected = selectedFinishingServices.has(option.dataset.finishingService);
                    option.classList.toggle("selected", selected);
                    option.setAttribute("aria-pressed", String(selected));
                });

            updatePriceSummary();

        });

    });


/* =========================
   PLACE ORDER
   ========================= */

$("printOrderForm")
    .addEventListener(
        "submit",
        event => {

            event.preventDefault();

            if (!currentStudent) {

                showToast(
                    "Please log in first."
                );

                return;
            }

            const file =
                fileInput.files[0];

            if (!file) {

                showToast(
                    "Please upload a PDF."
                );

                return;
            }

            const data =
                getPrintInputs();

            currentPendingOrder = {

                id:
                    `PQ-${orderSequence++}`,

                reg:
                    currentStudent.reg,

                student:
                    currentStudent.name,

                batch:
                    currentStudent.batch,

                course:
                    currentStudent.course,

                file:
                    file.name,

                fileSize:
                    file.size,

                pages:
                    data.pages,

                copies:
                    data.copies,

                type:
                    data.type,

                rate:
                    data.rate,

                amount:
                    data.amount,

                finishingAmount:
                    data.finishingAmount,

                finishingServices:
                    data.finishingServices,

                notes:
                    $("printNotes").value.trim(),

                status:
                    STATUS.QUEUED,

                paymentStatus:
                    "Unpaid",

                paymentMethod:
                    "Demo payment",

                createdAt:
                    Date.now(),

                createdTime:
                    getDateTime(),

                paymentTime:
                    null,

                collectedAt:
                    null

            };

            const estimate =
                getETA(
                    currentPendingOrder
                );

            $("checkoutFile")
                .textContent =
                currentPendingOrder.file;

            $("checkoutType")
                .textContent =
                data.type === "BW"
                    ? "Black & White"
                    : "Colour";

            $("checkoutPages")
                .textContent =
                `${data.pages} pages × ${data.copies} copies = ${data.totalPages} prints`;

            $("checkoutFinishing")
                .textContent =
                data.finishingServices.length
                    ? data.finishingServices
                        .map(service => `${service.label} ${money(service.amount)}`)
                        .join(", ")
                    : "None";

            $("checkoutEstimate")
                .textContent =
                estimate.text;

            $("checkoutTotal")
                .textContent =
                money(data.amount);

            $("paymentModal")
                .classList
                .remove("hidden");

        }
    );


/* =========================
   PAYMENT
   ========================= */

function confirmOrderPayment() {

    if (!currentPendingOrder) {

        showToast(
            "No pending order."
        );

        return;
    }

    const button =
        $("confirmPaymentBtn");

    button.disabled = true;

    button.textContent =
        "Processing payment…";

    setTimeout(() => {

        const order = {

            ...currentPendingOrder,

            paymentStatus:
                "Paid",

            paymentTime:
                getDateTime()

        };

        orders.unshift(order);
        saveOrders();

        currentPendingOrder = null;

        closeModal(
            "paymentModal"
        );

        $("confirmationOrderId")
            .textContent =
            order.id;

        $("confirmationETA")
            .textContent =
            getETA(order).text;

        $("confirmationModal")
            .classList
            .remove("hidden");

        $("printOrderForm")
            .reset();

        currentPrintType = "BW";
        selectedFinishingServices.clear();

        document
            .querySelectorAll("[data-finishing-service]")
            .forEach(option => {
                option.classList.remove("selected");
                option.setAttribute("aria-pressed", "false");
            });

        document
            .querySelectorAll(
                "[data-print-type]"
            )
            .forEach(button => {

                button.classList.toggle(
                    "selected",
                    button.dataset.printType === "BW"
                );

            });

        updateSelectedFile();
        updatePriceSummary();

        refreshAllPortals();

        button.disabled = false;

        button.textContent =
            "Simulate Payment & Place Order →";

        showToast(
            "Order successfully placed."
        );

    }, 700);
}


function finishOrderConfirmation() {

    closeModal(
        "confirmationModal"
    );

    studentNavigate(
        "orders"
    );
}

function studentViewReadyOrder() {

    closeModal("studentReadyModal");
    studentNavigate("orders");

}


/* =========================
   STUDENT HOME
   ========================= */

function renderStudentHome() {

    if (!currentStudent) return;

    const list =
        getStudentOrders();

    $("studentTotalOrders")
        .textContent =
        list.length;

    $("studentActiveOrders")
        .textContent =
        list.filter(order =>
            order.status === STATUS.QUEUED ||
            order.status === STATUS.PRINTING
        ).length;

    $("studentReadyOrders")
        .textContent =
        list.filter(order =>
            order.status === STATUS.READY
        ).length;

    $("studentTotalPaid")
        .textContent =
        money(
            list
                .filter(order =>
                    order.paymentStatus === "Paid"
                )
                .reduce(
                    (sum, order) =>
                        sum + order.amount,
                    0
                )
        );

    const recent =
        list.slice(0, 3);

    $("studentRecentOrders")
        .innerHTML =
        recent.length
            ? recent
                .map(order =>
                    orderCard(
                        order,
                        "student"
                    )
                )
                .join("")
            : emptyState(
                "No print orders yet",
                "Submit your first PDF to see it here.",
                "▤"
            );
}


/* =========================
   ORDER CARD
   ========================= */

function orderCard(order, mode) {

    const student =
        mode === "student";

    const totalPages =
        getPages(order);

    const finishingInfo =
        Array.isArray(order.finishingServices) && order.finishingServices.length
            ? `<br>Finishing: ${order.finishingServices
                .map(service => `${escapeHTML(service.label)} ${money(service.amount)}`)
                .join(", ")}`
            : "";

    let actions = "";

    if (
        student &&
        order.status === STATUS.READY
    ) {

        actions = `
            <button
                class="qr-action-btn"
                onclick="showCollectionQR('${order.id}')"
            >
                ▦ Collection QR
            </button>
        `;
    }

    if (
        !student &&
        order.status === STATUS.QUEUED
    ) {

        actions = `
            <button
                class="small-action-btn"
                onclick="startPrinting('${order.id}')"
            >
                Start Printing
            </button>
        `;
    }

    if (
        !student &&
        order.status === STATUS.PRINTING
    ) {

        actions = `
            <button
                class="qr-action-btn"
                onclick="markOrderReady('${order.id}')"
            >
                ✓ Mark Ready
            </button>
        `;
    }

    if (
        !student &&
        order.status === STATUS.READY
    ) {

        actions = `
            <button
                class="small-action-btn"
                onclick="markOrderCollected('${order.id}')"
            >
                Confirm Collection
            </button>
        `;
    }

    const staffInfo = student
        ? ""
        : `
            <br>
            Student:
            <strong>
                ${escapeHTML(order.student)}
            </strong>
            · ${escapeHTML(order.reg)}
            <br>
            ${escapeHTML(order.course)}
            · ${escapeHTML(order.batch)}
            <br>
            Instructions:
            ${escapeHTML(order.notes || "None")}
        `;

    return `

        <article class="order-item">

            <div class="order-main">

                <div class="order-document-icon">
                    ▤
                </div>

                <div>

                    <span class="order-id">
                        ${escapeHTML(order.id)}
                    </span>

                    <h3>
                        ${escapeHTML(order.file)}
                    </h3>

                    <div class="order-meta">

                        ${totalPages} prints
                        ·
                        ${
                            order.type === "BW"
                                ? "Black & White"
                                : "Colour"
                        }
                        ·
                        ${escapeHTML(order.createdTime)}

                        ${staffInfo}

                        ${finishingInfo}

                        <br>

                        ETA:
                        ${escapeHTML(
                            getETA(order).text
                        )}

                    </div>

                </div>

            </div>


            <div class="order-right">

                <span
                    class="order-status
                    ${getStatusClass(order.status)}"
                >
                    ${escapeHTML(
                        getStatusLabel(
                            order.status
                        )
                    )}
                </span>

                <span class="order-price">
                    ${money(order.amount)}
                </span>

                ${actions}

            </div>

        </article>
    `;
}


/* =========================
   STUDENT FILTER
   ========================= */

document
    .querySelectorAll(
        "[data-order-filter]"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                currentFilterStudent =
                    button.dataset.orderFilter;

                document
                    .querySelectorAll(
                        "[data-order-filter]"
                    )
                    .forEach(chip => {

                        chip.classList.toggle(
                            "active",
                            chip === button
                        );

                    });

                renderStudentOrders();

            }
        );

    });


function renderStudentOrders() {

    if (!currentStudent) return;

    let list =
        getStudentOrders();

    if (
        currentFilterStudent !==
        "All"
    ) {

        list =
            list.filter(order => {

                if (
                    currentFilterStudent ===
                    "Ready"
                ) {

                    return (
                        order.status ===
                        STATUS.READY
                    );
                }

                return (
                    order.status ===
                    currentFilterStudent
                );

            });

    }

    if (currentSearchStudent) {

        list = list.filter(order =>
            `${order.id} ${order.file} ${order.status} ${order.type}`
                .toLowerCase()
                .includes(currentSearchStudent)
        );

    }

    $("studentAllOrders")
        .innerHTML =
        list.length

            ? list
                .map(order =>
                    orderCard(
                        order,
                        "student"
                    )
                )
                .join("")

            : emptyState(
                currentSearchStudent ? "No matching orders" : "Nothing to show",
                currentSearchStudent
                    ? "Try another order ID or file name."
                    : "No orders match this filter.",
                "◷"
            );
}

$("studentOrderSearch").addEventListener("input", event => {

    currentSearchStudent =
        event.target.value.trim().toLowerCase();

    renderStudentOrders();

});


/* =========================
   STAFF FILTER
   ========================= */

document
    .querySelectorAll(
        "[data-staff-filter]"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                currentFilterStaff =
                    button.dataset.staffFilter;

                document
                    .querySelectorAll(
                        "[data-staff-filter]"
                    )
                    .forEach(chip => {

                        chip.classList.toggle(
                            "active",
                            chip === button
                        );

                    });

                renderStaffOrders();

            }
        );

    });


function renderStaffOrders() {

    let list =
        [...orders];

    if (
        currentFilterStaff !==
        "All"
    ) {

        list =
            list.filter(order => {

                if (
                    currentFilterStaff ===
                    "Ready"
                ) {

                    return (
                        order.status ===
                        STATUS.READY
                    );
                }

                return (
                    order.status ===
                    currentFilterStaff
                );

            });

    }

    if (currentSearchStaff) {

        list = list.filter(order =>
            `${order.id} ${order.file} ${order.student} ${order.reg} ${order.course} ${order.status}`
                .toLowerCase()
                .includes(currentSearchStaff)
        );

    }

    $("staffAllOrders")
        .innerHTML =
        list.length

            ? list
                .map(order =>
                    orderCard(
                        order,
                        "staff"
                    )
                )
                .join("")

            : emptyState(
                currentSearchStaff ? "No matching orders" : "No orders found",
                currentSearchStaff
                    ? "Try another order ID, student or file name."
                    : "Student orders will appear here automatically.",
                "▤"
            );
}

$("staffOrderSearch").addEventListener("input", event => {

    currentSearchStaff =
        event.target.value.trim().toLowerCase();

    renderStaffOrders();

});


/* =========================
   STAFF DASHBOARD
   ========================= */

function renderStaffDashboard() {

    const queuedCount =
        orders.filter(order => order.status === STATUS.QUEUED).length;

    const printingCount =
        orders.filter(order => order.status === STATUS.PRINTING).length;

    const readyCount =
        orders.filter(order => order.status === STATUS.READY).length;

    $("staffLiveOrderCount")
        .textContent =
        queuedCount + printingCount;

    $("staffPending")
        .textContent =
        queuedCount;

    $("staffPrinting")
        .textContent =
        printingCount;

    $("staffReady")
        .textContent =
        readyCount;

    $("staffRevenue")
        .textContent =
        money(totalRevenue());

    $("dashboardRevenue")
        .textContent =
        money(totalRevenue());

    $("dashboardOrderCount")
        .textContent =
        orders.length;

    $("dashboardPageCount")
        .textContent =
        totalRequestedPages();

    $("dashboardCollectedCount")
        .textContent =
        orders.filter(
            order =>
                order.status ===
                STATUS.COLLECTED
        ).length;

    const recent =
        [...orders]
            .sort(
                (a,b) =>
                    b.createdAt -
                    a.createdAt
            )
            .slice(0,5);

    $("staffRecentOrders")
        .innerHTML =
        recent.length

            ? recent
                .map(order =>
                    orderCard(
                        order,
                        "staff"
                    )
                )
                .join("")

            : emptyState(
                "Waiting for student orders",
                "New orders will appear here after payment.",
                "◷"
            );
}


/* =========================
   START PRINTING
   ========================= */

function startPrinting(orderId) {

    const order =
        getOrder(orderId);

    if (!order) return;

    if (
        order.status !==
        STATUS.QUEUED
    ) {

        showToast(
            "This order is not queued."
        );

        return;
    }

    order.status =
        STATUS.PRINTING;

    order.startedPrintingAt =
        Date.now();

    saveOrders();
    refreshAllPortals();

    showToast(
        `${order.id} is now printing.`
    );
}


/* =========================
   READY
   ========================= */

function markOrderReady(orderId) {

    const order =
        getOrder(orderId);

    if (!order) return;

    if (
        order.status !==
        STATUS.PRINTING
    ) {

        showToast(
            "Start printing first."
        );

        return;
    }

    order.status =
        STATUS.READY;

    order.readyAt =
        Date.now();

    saveOrders();
    $("staffReadyOrderId")
        .textContent =
        order.id;

    refreshAllPortals();

    $("staffReadyModal")
        .classList
        .remove("hidden");

    showToast(
        `${order.id} is ready for collection.`
    );
}


/* =========================
   COLLECTION
   ========================= */

function markOrderCollected(orderId) {

    const order =
        getOrder(orderId);

    if (!order) return;

    if (
        order.status !==
        STATUS.READY
    ) {

        showToast(
            "Only ready orders can be collected."
        );

        return;
    }

    if (
        !confirm(
            `Confirm collection of ${order.id}?`
        )
    ) return;

    order.status =
        STATUS.COLLECTED;

    order.collectedAt =
        getDateTime();

    saveOrders();
    refreshAllPortals();

    showToast(
        `${order.id} marked as collected.`
    );
}


/* =========================
   QR
   ========================= */

function showCollectionQR(orderId) {

    const order =
        getOrder(orderId);

    if (!order) return;

    if (
        order.status !==
        STATUS.READY
    ) {

        showToast(
            "QR is available when the order is ready."
        );

        return;
    }

    $("collectionQR")
        .innerHTML = "";

    $("collectionOrderId")
        .textContent =
        order.id;

    const qrData =
        JSON.stringify({

            system:
                "PrintHubASIET",

            institution:
                "Adi Shankara Institute of Engineering & Technology",

            orderId:
                order.id,

            registration:
                order.reg,

            document:
                order.file,

            status:
                order.status

        });

    if (
        typeof QRCode ===
        "undefined"
    ) {

        showToast(
            "QR service is unavailable."
        );

        return;
    }

    new QRCode(
        $("collectionQR"),
        {

            text:
                qrData,

            width:
                185,

            height:
                185,

            colorDark:
                "#050505",

            colorLight:
                "#ffffff",

            correctLevel:
                QRCode.CorrectLevel.M

        }
    );

    $("qrModal")
        .classList
        .remove("hidden");
}


/* =========================
   FINANCE
   ========================= */

function renderFinance() {

    const paid =
        orders.filter(
            order =>
                order.paymentStatus ===
                "Paid"
        );

    $("financeTotal")
        .textContent =
        money(totalRevenue());

    $("financeTransactions")
        .textContent =
        paid.length;

    $("financeCollection")
        .textContent =
        orders.filter(
            order =>
                order.status ===
                STATUS.READY
        ).length;

    $("financeCollected")
        .textContent =
        orders.filter(
            order =>
                order.status ===
                STATUS.COLLECTED
        ).length;

    $("paymentLedger")
        .innerHTML =
        paid.length

            ? [...paid]
                .sort(
                    (a,b) =>
                        b.createdAt -
                        a.createdAt
                )
                .map(order => `

                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(order.id)}
                            </strong>
                        </td>

                        <td>
                            ${escapeHTML(order.student)}
                        </td>

                        <td>
                            ${escapeHTML(order.reg)}
                        </td>

                        <td>
                            ${escapeHTML(
                                order.paymentTime
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                order.paymentMethod
                            )}
                        </td>

                        <td>
                            <strong>
                                ${money(order.amount)}
                            </strong>
                        </td>

                        <td>
                            <span class="ledger-status">
                                Recorded
                            </span>
                        </td>

                    </tr>

                `)
                .join("")

            : `

                <tr>

                    <td
                        colspan="7"
                        style="
                            text-align:center;
                            padding:30px;
                            color:#999;
                        "
                    >
                        No payments recorded yet.
                    </td>

                </tr>

            `;
}


/* =========================
   REPORTS
   ========================= */

function renderReports() {

    const bw =
        orders
            .filter(
                order =>
                    order.type === "BW"
            )
            .reduce(
                (sum, order) =>
                    sum + getPages(order),
                0
            );

    const colour =
        orders
            .filter(
                order =>
                    order.type === "Colour"
            )
            .reduce(
                (sum, order) =>
                    sum + getPages(order),
                0
            );

    $("reportOrders")
        .textContent =
        orders.length;

    $("reportPages")
        .textContent =
        totalRequestedPages();

    $("reportBW")
        .textContent =
        bw;

    $("reportColour")
        .textContent =
        colour;

    $("reportRevenue")
        .textContent =
        money(totalRevenue());
}


/* =========================
   EXPORT CSV
   ========================= */

function exportPayments() {

    const paid =
        orders.filter(
            order =>
                order.paymentStatus ===
                "Paid"
        );

    const rows = [

        [
            "Order ID",
            "Student",
            "Registration",
            "Batch",
            "Course",
            "Document",
            "Pages",
            "Copies",
            "Print Type",
            "Amount",
            "Payment Status",
            "Payment Method",
            "Payment Time",
            "Order Status"
        ],

        ...paid.map(order => [

            order.id,

            order.student,

            order.reg,

            order.batch,

            order.course,

            order.file,

            order.pages,

            order.copies,

            order.type === "BW"
                ? "Black & White"
                : "Colour",

            order.amount,

            order.paymentStatus,

            order.paymentMethod,

            order.paymentTime,

            order.status

        ])

    ];

    const csv =
        rows
            .map(row =>
                row
                    .map(value =>
                        `"${String(
                            value ?? ""
                        ).replace(
                            /"/g,
                            '""'
                        )}"`
                    )
                    .join(",")
            )
            .join("\r\n");

    const blob =
        new Blob(
            ["\uFEFF" + csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        "PrintHubASIET_Payments.csv";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    showToast(
        "Payment report exported."
    );
}


/* =========================
   MODAL
   ========================= */

function closeModal(id) {

    $(id)
        .classList
        .add("hidden");
}

document
    .querySelectorAll(".modal")
    .forEach(modal => {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    modal
                ) {

                    modal
                        .classList
                        .add("hidden");

                }

            }
        );

    });


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) return;

        document
            .querySelectorAll(
                ".modal:not(.hidden)"
            )
            .forEach(modal => {

                modal
                    .classList
                    .add("hidden");

            });

    }
);


/* =========================
   REFRESH
   ========================= */

function refreshAllPortals() {

    updatePriceSummary();

    if (currentStudent) {

        renderStudentHome();

        renderStudentOrders();

    }

    renderStaffDashboard();

    renderStaffOrders();

    renderFinance();

    renderReports();
}

window.addEventListener("storage", event => {

    if (event.key !== ORDER_STORAGE_KEY) return;

    const previousOrders = orders;

    const updatedOrders =
        event.newValue ? JSON.parse(event.newValue) : [];

    if (!Array.isArray(updatedOrders)) return;

    const readyOrder = currentStudent
        ? updatedOrders.find(order => {
            const previousOrder =
                previousOrders.find(previous => previous.id === order.id);

            return order.status === STATUS.READY &&
                previousOrder?.status === STATUS.PRINTING &&
                order.reg.toLowerCase() === currentStudent.reg.toLowerCase();
        })
        : null;

    orders = updatedOrders;
    orderSequence = getNextOrderSequence();

    refreshAllPortals();

    if (
        readyOrder &&
        !$("studentPage").classList.contains("hidden")
    ) {
        $("studentReadyOrderId").textContent = readyOrder.id;
        $("studentReadyFile").textContent = readyOrder.file;
        $("studentReadyModal").classList.remove("hidden");
    }

});


/* =========================
   START
   ========================= */

updatePriceSummary();
refreshAllPortals();