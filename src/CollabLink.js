export function makeCollaborativeObject(rootID, obj, collabHub, path = '', context = { suppress: false }) {
  function serializeValue(val) {
    if (typeof val === 'string') return `${val}`;
    if (typeof val === 'number' || typeof val === 'boolean') return val;
    if (val === null) return 'null';
    if (Array.isArray(val)) return `[${val.map(serializeValue).join(', ')}]`;

    // Optional: handle simple plain objects
    if (typeof val === 'object' && val.constructor === Object) {
      const entries = Object.entries(val).map(([k, v]) => {
        return `"${k}": ${serializeValue(v)}`;
      });
      return `{${entries.join(', ')}}`;
    }

    // Fallback
    return 'null';
  }

  const EXCLUDES = ['autocomplete', 'autocompleteList', 'autocompleteList.filter', 'filter', 
    'connect', 'disconnect', 'link', 'linkGui',
    'initGui', 'get', 'username', 'setUserName','setUsername'];
  function shouldSend(path) {
    const parts = path.split(/\.|\[|\]/).filter(Boolean);
    const lastPart = parts[parts.length - 1];

    // Exclude if it matches any of the EXCLUDES exactly
    if (EXCLUDES.includes(lastPart)) return false;

    // Exclude if it starts with underscore (e.g. `_internal`)
    if (lastPart.startsWith('_')) return false;

    return true;
  }

  function appendPath(parentPath, prop) {
    if (/^\d+$/.test(prop)) {
      // It's an array index
      return `${parentPath}[${prop}]`;
    } else if (parentPath === '') {
      return prop;
    } else {
      return `${parentPath}.${prop}`;
    }
  }

  const applyRemoteChange = (root, message, context = { suppress: false }) => {
    context.suppress = true
    //console.log('apply', message)
    //return
    try {
       const parts = message.path.split(/\.|\[|\]/).filter(Boolean);
       const last = parts.pop();

       let target = root;
      //console.log('parts', parts, last)
      for ( let part of parts) {
        //console.log('target', target)
        target = target[part];
      }
      if (message.type === 'set') {
        console.log(target, last, message.value)
        target[last] = message.value;
      } else if (message.type === 'method') {
        console.log(target, last, message.value)
        target[last](...message.value);
      }
    } catch (err) {
      console.error('Failed to apply remote change:', root, message, err);
    } finally {
      context.suppress = false;
    }
  }

  collabHub.on(rootID, (incoming) => {
    //console.log('ch', incoming)
    applyRemoteChange(obj, incoming.values, ctx);
  });

  return new Proxy(obj, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      //console.log('get', target, prop, value, receiver)

      if (value && typeof value === 'object') {
        const subPath = appendPath(path, prop);
        return makeCollaborativeObject(rootID, value, collabHub, subPath, ctx);
      }

      if (typeof value === 'function') {
        return function (...args) {
          const fullPath = appendPath(path, prop);

          if (!ctx.suppress && shouldSend(fullPath)) {
            collabHub.control(rootID, {
              type: 'method',
              path: fullPath,
              value: args.map(serializeValue), // you can serialize here if needed
            });
          }

          return value.apply(target, args);
        };
      }
      /*
      if (typeof value === 'function') {
        //console.log('get function', target, prop, value, receiver)
        //console.log('ctx meth', ctx.suppress, BLOCKED_KEYS)
        return function (...args) {
          const fullPath = appendPath(path, prop);
          console.log('method', fullPath, prop, args)
          if( !isSerializable(args) ){
            console.log('tried to send an audio object', value)
            }
          else if (!ctx.suppress && !BLOCKED_KEYS.has(fullPath)) {
      
            collabHub.control(rootID, {
              type: 'method',
              path: fullPath,
              args: [fullPath, args]
            });
          }
          return value.apply(target, args);
        };
      }
      */

      return value;
    },

    set(target, prop, value, receiver) {
      const result = Reflect.set(target, prop, value, receiver);
      const fullPath = appendPath(path, prop);
      //console.log('set', target, prop, value, receiver)
      if (!ctx.suppress && shouldSend(fullPath)) {
        collabHub.control(rootID, {
          type: 'set',
          path: fullPath,
          value: value, // NOTE: use raw value or serialized depending on transport
        });
      }

      return result;
    }  });
}

const BLOCKED_KEYS = new Set([
  'autocompleteList.filter',
  'debug',
  'internalFlag',
  'get'
  // add more keys here
]);

function isSerializable(value) {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isSerializable);
  }

  if (typeof value === 'object' && value.constructor === Object) {
    return Object.values(value).every(isSerializable);
  }

  return false;
}

export const ctx = { suppress: false };