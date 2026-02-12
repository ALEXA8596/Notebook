const TASKBONE_URL = "https://api.taskbone.com/";
const TASKBONE_OCR_FN = "execute?id=60f394af-85f6-40bc-9613-5d26dc283cbb";

export class Taskbone {
  private static STORAGE_KEY = 'taskbone_api_key';

  static getApiKey(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  static async initialize(): Promise<string | null> {
    const existingKey = this.getApiKey();
    if (existingKey) return existingKey;

    try {
      const response = await fetch(`${TASKBONE_URL}users/excalidraw-obsidian/identities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Failed to initialize Taskbone", response.statusText);
        return null;
      }

      const data = await response.json();
      if (data?.apiKey && typeof data.apiKey === "string") {
        localStorage.setItem(this.STORAGE_KEY, data.apiKey);
        return data.apiKey;
      }
    } catch (e) {
      console.error("Error initializing Taskbone", e);
    }
    return null;
  }

  static async getTextForImage(blob: Blob): Promise<string | null> {
    let apiKey = this.getApiKey();
    if (!apiKey) {
      apiKey = await this.initialize();
    }

    if (!apiKey) {
      console.error("No API key available for Taskbone");
      return null;
    }

    const base64Image = await this.blobToBase64(blob);
    const input = {
      records: [{
        image: base64Image
      }]
    };

    try {
      const response = await fetch(`${TASKBONE_URL}${TASKBONE_OCR_FN}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        console.error("Taskbone API error", response.statusText);
        return null;
      }

      const content = await response.json();
      return content.records[0]?.text || null;
    } catch (e) {
      console.error("Error calling Taskbone API", e);
      return null;
    }
  }

  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Remove data URL prefix (e.g., "data:image/png;base64,")
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error("Failed to convert blob to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
