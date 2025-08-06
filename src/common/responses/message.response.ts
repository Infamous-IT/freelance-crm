import { Expose } from 'class-transformer';
import { MessageRes } from '../interfaces/message-res.interface';

export class MessageResponse implements MessageRes {
  @Expose()
  message: string;

  @Expose()
  isSuccess: boolean;
}
