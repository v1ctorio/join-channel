

import rawConfig from '../joinchannel.config.json' with { type: 'json' } 

const config: JoinChannelConfig = rawConfig

interface JoinChannelConfig {
  channel_id: string;
  title: string;
  body: string;
  confirmationMessage: string;
  approvalMessage: {
  channel: string;
  text: string;
  approveButtonCaption: string;
  deleteButtonCaption: string;
  };
}

export default config