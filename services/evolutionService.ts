export class EvolutionService {
  static async sendMessage(apiUrl: string, apiKey: string, instance: string, phone: string, text: string) {
    // Garante que a URL não termine com barra e tenha o endpoint correto
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
          delay: 1200,
          linkPreview: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao enviar via Evolution API');
      }

      return await response.json();
    } catch (error) {
      console.error("Evolution API Error:", error);
      throw error;
    }
  }
}