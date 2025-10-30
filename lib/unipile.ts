const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY!;
const UNIPILE_BASE_URL = process.env.UNIPILE_BASE_URL!;
const UNIPILE_ACCOUNT_ID = process.env.UNIPILE_ACCOUNT_ID!;

export interface UnipileFollower {
  id: string;
  username: string;
  display_name?: string;
}

export class UnipileClient {
  private headers: HeadersInit;

  constructor() {
    this.headers = {
      'X-API-KEY': UNIPILE_API_KEY,
      'Content-Type': 'application/json',
    };
  }

  async getFollowers(): Promise<UnipileFollower[]> {
    try {
      const response = await fetch(
        `${UNIPILE_BASE_URL}/api/v1/users/${UNIPILE_ACCOUNT_ID}/followers`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error(`Unipile API error: ${response.status}`);
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching followers:', error);
      throw error;
    }
  }

  async sendMessage(recipientId: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${UNIPILE_BASE_URL}/api/v1/messages`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            account_id: UNIPILE_ACCOUNT_ID,
            attendees_ids: [recipientId],
            text: message,
          }),
        }
      );
      return response.ok;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }
}
