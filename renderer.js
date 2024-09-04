const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const ctx = canvasElement.getContext("2d");
const cameraSelect = document.getElementById("cameraSelect");

let currentStream;
let model;

// Функция для получения списка камер и обновления выпадающего списка
async function getCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter((device) => device.kind === "videoinput");

  cameraSelect.innerHTML = ""; // Очистка существующего списка

  videoDevices.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.text = device.label || `Camera ${index + 1}`;
    cameraSelect.appendChild(option);
  });

  // Если есть доступные камеры, используем первую по умолчанию
  if (videoDevices.length > 0) {
    startCamera(videoDevices[0].deviceId);
  }
}

// Функция для запуска камеры
async function startCamera(deviceId) {
  if (currentStream) {
    // Остановить все текущие потоки
    currentStream.getTracks().forEach((track) => track.stop());
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
    });
    videoElement.srcObject = stream;
    currentStream = stream;
    console.log("Камера подключена:", deviceId);
  } catch (error) {
    console.error("Ошибка при настройке камеры:", error);
  }
}

// Слушатель для изменения выбранной камеры
cameraSelect.addEventListener("change", (event) => {
  const selectedDeviceId = event.target.value;
  startCamera(selectedDeviceId);
});

// Загрузка модели Blazeface
async function loadBlazeface() {
  const blazeface = require("@tensorflow-models/blazeface");
  model = await blazeface.load();
  console.log("Модель Blazeface загружена");
  return model;
}

// Проверка на улыбку
function isSmiling(prediction) {
  const keypoints = prediction.landmarks;
  const leftMouth = keypoints[3];
  const rightMouth = keypoints[4];
  const topMouth = keypoints[2];
  const bottomMouth = keypoints[5];

  const mouthWidth = Math.abs(rightMouth[0] - leftMouth[0]);
  const mouthHeight = Math.abs(bottomMouth[1] - topMouth[1]);

  console.log("Ширина рта:", mouthWidth, "Высота рта:", mouthHeight);
  return mouthWidth > 1.5 * mouthHeight;
}

// Отрисовка маски клоуна
function drawClownMask(prediction) {
  const keypoints = prediction.landmarks;

  const nose = keypoints[2];
  const leftCheek = keypoints[0];
  const rightCheek = keypoints[1];

  ctx.beginPath();
  ctx.arc(nose[0], nose[1], 20, 0, Math.PI * 2);
  ctx.fillStyle = "red";
  ctx.fill();
  console.log("Рисуем нос на координатах:", nose);

  ctx.beginPath();
  ctx.arc(leftCheek[0], leftCheek[1], 15, 0, Math.PI * 2);
  ctx.arc(rightCheek[0], rightCheek[1], 15, 0, Math.PI * 2);
  ctx.fillStyle = "red";
  ctx.fill();
  console.log("Рисуем щеки на координатах:", leftCheek, rightCheek);
}

// Функция обнаружения лиц и применения маски
async function detectFaces() {
  console.log(model,)
  const predictions = await model.estimateFaces(videoElement, false);
  console.log(predictions, 'test');
  ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (predictions.length > 0) {
    predictions.forEach((prediction) => {
      console.log("Обнаружено лицо:", prediction);
      if (isSmiling(prediction)) {
        console.log("Улыбка обнаружена");
        drawClownMask(prediction);
      }
    });
  } else {
    console.log("Лицо не обнаружено");
  }
}

// Основная функция
async function main() {
  await getCameras();
  await loadBlazeface();

  setInterval(() => {
    detectFaces();
  }, 100);
}

main();
