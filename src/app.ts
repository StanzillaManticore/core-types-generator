import http from 'https';
import { Class, CoreLuaAPI, Enum, Func, Namespace, Signature } from './models';
import fs from 'fs';
import {
  arrayToString,
  getAnnotation,
  reservedNamesMapping,
  typeMapping
} from './utils';
import { TypeClass } from './TypeClass';
import { TypeField } from './TypeField';
import { TypeFunction } from './TypeFunction';
import { TypeSignature } from './TypeSignature';
import { TypeParameter } from './TypeParameter';
import { TypeReturn } from './TypeReturn';
import { TypeEnum } from './TypeEnum';

async function getCoreLuaAPI(): Promise<CoreLuaAPI> {
  return new Promise((res) => {
    http.get(
      'https://docs.coregames.com/assets/api/CoreLuaAPI.json',
      (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => res(JSON.parse(body)));
      }
    );
  });
}

function generateClassesLines(classes: Class[]): string[] {
  const lines = [];
  for (const obj of classes) {
    const typeClass = new TypeClass(
      false,
      obj.Name,
      obj.BaseType !== 'Object' ? obj.BaseType : undefined
    );
    if (obj.Events) {
      for (const event of obj.Events) {
        typeClass.addField(new TypeField(event.Name, ['Event']));
      }
    }
    if (obj.StaticFunctions) {
      for (const staticFunctions of obj.StaticFunctions) {
        typeClass.addFunction(
          generateFunction(obj.Name, staticFunctions, false),
          true
        );
      }
    }
    if (obj.Constructors) {
      for (const construct of obj.Constructors) {
        typeClass.addFunction(
          generateFunction(obj.Name, construct, false),
          true
        );
      }
    }
    for (const property of obj.Properties) {
      typeClass.addField(
        new TypeField(property.Name, [typeMapping(property.Type)])
      );
    }
    for (const memberFunction of obj.MemberFunctions) {
      typeClass.addFunction(generateFunction(obj.Name, memberFunction, true));
    }

    lines.push(...typeClass.getLines());
    lines.push('');
  }

  return lines;
}

function generateNamespacesLines(namespaces: Namespace[]): string[] {
  const lines = [];
  for (const obj of namespaces) {
    const typeClass = new TypeClass(true, obj.Name);

    if (obj.StaticEvents) {
      for (const event of obj.StaticEvents) {
        typeClass.addField(new TypeField(event.Name, ['Event']), true);
      }
    }
    for (const staticFunctions of obj.StaticFunctions) {
      typeClass.addFunction(
        generateFunction(obj.Name, staticFunctions, false),
        true
      );
    }

    lines.push(...typeClass.getLines());
    lines.push('');
  }

  return lines;
}

function generateEnumsLines(enums: Enum[]) {
  const lines = [];
  for (const obj of enums) {
    const typeEnum = new TypeEnum(obj.Name);
    for (const field of obj.Values) {
      typeEnum.addValue(field.Name, field.Value);
    }
    lines.push(...typeEnum.getLines());
  }
  return lines;
}

function generateFunction(
  className: string,
  func: Func,
  member: boolean
): TypeFunction {
  const typeFunction = new TypeFunction(
    `${className}${member ? ':' : '.'}${func.Name}`
  );
  const signatures = generateSignatures(func.Signatures);
  for (const signature of signatures) {
    typeFunction.addSignature(signature);
  }
  return typeFunction;
}

function generateSignatures(signatures: Signature[]): TypeSignature[] {
  const typeSignatures = [];
  for (const signature of signatures) {
    const typeSignature = new TypeSignature();
    for (const parameter of signature.Parameters) {
      typeSignature.addParameter(
        new TypeParameter(
          reservedNamesMapping(parameter.Name),
          [typeMapping(parameter.Type)],
          (parameter.IsVariadic || parameter.IsOptional) ?? false
        )
      );
    }

    if (signature.Returns.length > 0) {
      const typeReturn = new TypeReturn();
      for (const ret of signature.Returns) {
        typeReturn.addtype(typeMapping(ret.Type));
      }
      typeSignature.addReturn(typeReturn);
    }

    typeSignatures.push(typeSignature);
  }
  return typeSignatures;
}

async function run() {
  const coreLuaAPI = await getCoreLuaAPI();
  const lines = [];

  lines.push(...generateClassesLines(coreLuaAPI.Classes));
  lines.push(...['', '', '', '', '']);
  lines.push(...generateNamespacesLines(coreLuaAPI.Namespaces));
  lines.push(...['', '', '', '', '']);
  lines.push(...generateEnumsLines(coreLuaAPI.Enums));
  lines.push(getAnnotation('type', 'CoreObject'));
  lines.push('script = nil');

  fs.writeFileSync('core-games-api.def.lua', arrayToString(lines));
}

run();
