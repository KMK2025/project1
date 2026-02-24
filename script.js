const studentForm = document.getElementById("student-form");
const studentNameInput = document.getElementById("student-name");
const studentTableBody = document.getElementById("student-table-body");
const presentCountSpan = document.getElementById("present-count");
const markAllPresentBtn = document.getElementById("mark-all-present");
const clearAllBtn = document.getElementById("clear-all");
const saveExcelBtn = document.getElementById("save-excel");
const totalCountSpan = document.getElementById("total-count");
const absentCountSpan = document.getElementById("absent-count");
const presentRateSpan = document.getElementById("present-rate");

const STORAGE_KEY = "attendance_data_v1";

function getTodayKey() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const currentDateKey = getTodayKey();

let allData = {};
let students = [];
let nextId = 1;

function saveStudents() {
  try {
    allData[currentDateKey] = students;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
  } catch (error) {
    console.error("출석 정보 저장 중 오류 발생", error);
  }
}

function loadStudents() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      allData = {};
      students = [];
      renderStudents();
      return;
    }

    const parsed = JSON.parse(data);

    if (Array.isArray(parsed)) {
      allData = {
        [currentDateKey]: parsed.map((s) => ({
          id: s.id,
          name: s.name,
          present: !!s.present,
        })),
      };
    } else if (parsed && typeof parsed === "object") {
      allData = parsed;
    } else {
      allData = {};
    }

    const todayStudents = allData[currentDateKey];
    students = Array.isArray(todayStudents)
      ? todayStudents.map((s) => ({
          id: s.id,
          name: s.name,
          present: !!s.present,
        }))
      : [];

    const maxId = students.reduce(
      (max, s) => (typeof s.id === "number" && s.id > max ? s.id : max),
      0
    );
    nextId = maxId + 1;

    renderStudents();
  } catch (error) {
    console.error("출석 정보 불러오기 중 오류 발생", error);
  }
}

function exportToExcel() {
  if (typeof XLSX === "undefined") {
    alert("엑셀 라이브러리가 로드되지 않았습니다.");
    return;
  }

  const dateKeys = Object.keys(allData || {}).sort();
  if (dateKeys.length === 0) {
    alert("저장된 출석 정보가 없습니다.");
    return;
  }

  const studentMap = new Map();

  dateKeys.forEach((dateKey) => {
    const list = Array.isArray(allData[dateKey]) ? allData[dateKey] : [];
    list.forEach((s) => {
      const name = s.name;
      if (!name) return;
      if (!studentMap.has(name)) {
        studentMap.set(name, { name, records: {} });
      }
      studentMap.get(name).records[dateKey] = !!s.present;
    });
  });

  const studentEntries = Array.from(studentMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ko")
  );

  const header = ["번호", "이름", ...dateKeys, "출석률"];
  const wsData = [header];

  studentEntries.forEach((stu, index) => {
    let presentCount = 0;
    const dayValues = dateKeys.map((dateKey) => {
      const present = stu.records[dateKey] === true;
      if (present) presentCount += 1;
      return present ? "출석" : "결석";
    });
    const totalDays = dateKeys.length;
    const rate =
      totalDays === 0 ? 0 : Math.round((presentCount / totalDays) * 100);

    wsData.push([index + 1, stu.name, ...dayValues, rate]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "출석부");

  XLSX.writeFile(wb, "attandence_info.xlsx");
}

// 학생 추가
studentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = studentNameInput.value.trim();
  if (!name) return;

  const student = {
    id: nextId++,
    name,
    present: false,
  };

  students.push(student);
  saveStudents();
  renderStudents();
  studentNameInput.value = "";
  studentNameInput.focus();
});

// 학생 목록 렌더링
function renderStudents() {
  studentTableBody.innerHTML = "";

  students.forEach((student, index) => {
    const tr = document.createElement("tr");

    // 번호
    const numberTd = document.createElement("td");
    numberTd.textContent = index + 1;
    tr.appendChild(numberTd);

    // 이름
    const nameTd = document.createElement("td");
    nameTd.textContent = student.name;
    tr.appendChild(nameTd);

    // 출석 체크박스
    const presentTd = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = student.present;

    checkbox.addEventListener("change", () => {
      student.present = checkbox.checked;
      updatePresentCount();
      saveStudents();
    });

    presentTd.appendChild(checkbox);
    tr.appendChild(presentTd);

    studentTableBody.appendChild(tr);
  });

  updatePresentCount();
}

// 출석 인원 및 요약 정보 갱신
function updatePresentCount() {
  const totalCount = students.length;
  const presentCount = students.filter((s) => s.present).length;
  const absentCount = totalCount - presentCount;
  const presentRate =
    totalCount === 0 ? 0 : Math.round((presentCount / totalCount) * 100);

  totalCountSpan.textContent = totalCount;
  presentCountSpan.textContent = presentCount;
  absentCountSpan.textContent = absentCount;
  presentRateSpan.textContent = presentRate;
}

// 모두 출석
markAllPresentBtn.addEventListener("click", () => {
  students = students.map((s) => ({ ...s, present: true }));
  renderStudents();
  saveStudents();
});

// 모두 결석
clearAllBtn.addEventListener("click", () => {
  students = students.map((s) => ({ ...s, present: false }));
  renderStudents();
  saveStudents();
});

saveExcelBtn.addEventListener("click", () => {
  exportToExcel();
});

loadStudents();