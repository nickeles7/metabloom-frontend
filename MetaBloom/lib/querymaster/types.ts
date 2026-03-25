/**
 * QueryMaster Types
 * Type definitions for the QueryMaster SQL expert AI system
 */

export interface QueryMasterRequest {
  functionName: string;
  parameters: any;
  intent: string;
  context?: string;
  metadata?: {
    userIntent?: string;
    buildingContext?: string;
    conversationState?: string;
  };
}

export interface QueryMasterResponse {
  success: boolean;
  data?: any[];
  error?: string;
  executionTime?: number;
  queryGenerated?: string;
}
