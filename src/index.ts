/* eslint-disable no-restricted-syntax */
import { useEffect, useMemo, useState } from 'react';

/**
 *
 * @param {object} params
 * @returns {URL}
 */
function setQueryToCurrentUrl(params: Record<string, any>) {
  const { URL } = typeof window !== 'undefined' ? window : ({} as any);
  const url = new URL(window?.location?.href);

  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        url.searchParams.delete(key);
        value.forEach((valueItem) => {
          url.searchParams.append(key, valueItem);
        });
      } else if (value instanceof Date) {
        if (!Number.isNaN(value.getTime())) {
          url.searchParams.set(key, value.toISOString());
        }
      } else if (typeof value === 'object') {
        url.searchParams.set(key, JSON.stringify(value));
      } else {
        url.searchParams.set(key, value);
      }
    } else {
      url.searchParams.delete(key);
    }
  });
  return url;
}

export function useUrlSearchParams(
  initial: Record<string, string | number> = {},
  config: {
    disabled?: boolean;
  } = { disabled: false },
): [Record<string, string | number>, (value: Record<string, string | number>) => void] {
  /**
   * The main idea of this hook is to make things response to change of `window.location.search`,
   * so no need for introducing new state (in the mean time).
   * Whenever `window.location.search` is changed but  not cause re-render, call `forceUpdate()`.
   * Whenever the component - user of this hook - re-render, this hook should return
   * the query object that corresponse to the current `window.location.search`
   */
  const [, forceUpdate] = useState<Record<string, any>>();

  const locationSearch = typeof window !== 'undefined' && window?.location?.search;

  /**
   * @type {URLSearchParams}
   */
  const urlSearchParams = useMemo(() => {
    if (config.disabled) return {};
    return new URLSearchParams(locationSearch || {});
  }, [config.disabled, locationSearch]);

  const params: Record<string, string | number> = useMemo(() => {
    if (config.disabled) return {};
    if (typeof window === 'undefined' || !window.URL) return {};
    let result: any = [];
    // @ts-ignore
    urlSearchParams.forEach((value, key) => {
      result.push({
        key,
        value,
      });
    });

    // group by key
    result = result.reduce((acc: any, val: any) => {
      (acc[val.key] = acc[val.key] || []).push(val);
      return acc;
    }, {});

    result = Object.keys(result).map((key) => {
      const valueGroup = result[key];
      if (valueGroup.length === 1) {
        return [key, valueGroup[0].value];
      }
      return [key, valueGroup.map(({ value }: { value: any }) => value)];
    });

    const newParams = { ...initial };

    result.forEach(([key, value]: any[]) => {
      newParams[key] = parseValue(key, value, {}, initial);
    });

    return newParams;
  }, [config.disabled, initial, urlSearchParams]);

  function redirectToNewSearchParams(newParams: Record<string, any>) {
    if (typeof window === 'undefined' || !window.URL) return;
    const url = setQueryToCurrentUrl(newParams);
    if (window.location.search !== url.search) {
      window.history.replaceState(window.history.state, '', url.toString());
    }
    if (urlSearchParams.toString() !== url.searchParams.toString()) {
      forceUpdate({});
    }
  }

  useEffect(() => {
    if (config.disabled) return;
    if (typeof window === 'undefined' || !window.URL) return;
    redirectToNewSearchParams({
      ...initial,
      ...params,
    });
  }, [config.disabled, params]);

  const setParams = (newParams: Record<string, string | number>) => {
    redirectToNewSearchParams(newParams);
  };

  useEffect(() => {
    if (config.disabled) return () => {};
    if (typeof window === 'undefined' || !window.URL) return () => {};

    const onPopState = () => {
      forceUpdate({});
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [config.disabled]);

  return [params, setParams];
}

const booleanValues = {
  true: true,
  false: false,
};

function parseValue(
  key: string | number,
  _value: any,
  types: Record<string, any>,
  defaultParams: Record<string, any>,
) {
  if (!types) return _value;
  const type = types[key];
  const value = _value === undefined ? defaultParams[key] : _value;

  if (type === Number) {
    return Number(value);
  }
  if (type === Boolean || _value === 'true' || _value === 'false') {
    return booleanValues[value];
  }
  if (Array.isArray(type)) {
    // eslint-disable-next-line eqeqeq
    return type.find((item) => item == value) || defaultParams[key];
  }
  return value;
}
