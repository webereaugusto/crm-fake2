
// This file handles calls to the Evolution API (Node.js backend for WhatsApp)

export class EvolutionService {
  private static baseUrl = ''; // Set from config
  private static apiKey = '';

  static async sendMessage(phone: string, text: string) {
    // const response = await fetch(`${this.baseUrl}/message/sendText/${instance}`, {
    //   method: 'POST',
    //   headers: { 'apikey': this.apiKey, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ number: phone, text })
    // });
    return null;
  }

  static async getInstances() {
    // return fetch(`${this.baseUrl}/instance/fetchInstances`, ...);
  }
}
