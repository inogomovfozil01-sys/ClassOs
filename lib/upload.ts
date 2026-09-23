export function uploadFile(
  formData: FormData,
  onProgress: (percent: number) => void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(Error(data.error || "Не удалось загрузить файл"));
      } catch {
        reject(Error("Не удалось обработать ответ сервера"));
      }
    };
    xhr.onerror = () => reject(Error("Нет соединения. Повторите загрузку."));
    xhr.onabort = () => reject(Error("Загрузка отменена"));
    xhr.send(formData);
  });
}
