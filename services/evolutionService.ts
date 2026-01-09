
export class EvolutionService {
  static async createInstance(apiUrl: string, apiKey: string, instance: string) {
    const cleanUrl = apiUrl.replace(/\/$/, '');
    const url = `${cleanUrl}/instance/create`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceName: instance,
        token: apiKey,
        number: "",
        qrcode: true
      })
    });
    return response.json();
  }

  static async getQrCode(apiUrl: string, apiKey: string, instance: string) {
    const cleanUrl = apiUrl.replace(/\/$/, '');
    const url = `${cleanUrl}/instance/connect/${instance}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'apikey': apiKey }
    });
    return response.json();
  }

  static async getConnectionStatus(apiUrl: string, apiKey: string, instance: string) {
    const cleanUrl = apiUrl.replace(/\/$/, '');
    const url = `${cleanUrl}/instance/connectionStatus/${instance}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'apikey': apiKey }
      });
      return response.json();
    } catch (e) {
      return { instance: { state: 'DISCONNECTED' } };
    }
  }

  static async logoutInstance(apiUrl: string, apiKey: string, instance: string) {
    const cleanUrl = apiUrl.replace(/\/$/, '');
    const url = `${cleanUrl}/instance/logout/${instance}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'apikey': apiKey }
    });
    return response.json();
  }

  static async sendMessage(apiUrl: string, apiKey: string, instance: string, phone: string, text: string) {
    const cleanUrl = apiUrl.replace(/\/$/, '');
    const url = `${cleanUrl}/message/sendText/${instance}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'apikey': apiKey, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          number: phone, 
          text: text,
          delay: 100,
          linkPreview: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao enviar mensagem');
      }

      return await response.json();
    } catch (error) {
      console.error("Evolution API Error:", error);
      throw error;
    }
  }
}
