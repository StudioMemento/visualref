export class CommandBus{
  constructor(context){this.context=context;this.handlers=new Map();}
  register(type,handler){this.handlers.set(type,handler);return this;}
  dispatch(type,payload={}){const handler=this.handlers.get(type);if(!handler)throw new Error(`Unknown command: ${type}`);return handler(payload,this.context);}
}
