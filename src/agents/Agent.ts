export class Agent {
    constructor(
      public name: string,
      public role: string
    ) {}
  
    describe(): void {
      console.log(`Agent: ${this.name}`);
      console.log(`Role: ${this.role}`);
    }
  }