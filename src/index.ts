/* eslint-disable no-restricted-syntax */
import { useEffect, useMemo, useState } from 'react';

/**
 *
 * @param {object} params
 * @returns {URL}
 */
function setQueryToCurrentUrl(params: Record<string, any>) {
  const { URL } = window;
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

export function useUrlSearchParams(initial = {}) {
  /**
   * The main idea of this hook is to make things response to change of `window.location.search`,
   * so no need for introducing new state (in the mean time).
   * Whenever `window.location.search` is changed but  not cause re-render, call `forceUpdate()`.
   * Whenever the component - user of this hook - re-render, this hook should return
   * the query object that corresponse to the current `window.location.search`
   */
  const [, forceUpdate] = useState<Record<string, any>>();

  const locationSearch = window?.location?.search;

  /**
   * @type {URLSearchParams}
   */
  const urlSearchParams = useMemo(() => {
    return new URLSearchParams(locationSearch || {});
  }, [locationSearch]);

  const params = useMemo(() => {
    if (typeof window === undefined || !window.URL) return {};
    let result: any = [];
    // @ts-ignore
    for (const item of urlSearchParams) {
      result.push({
        key: item[0],
        value: item[1],
      });
    }

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
  }, [urlSearchParams]);

  function redirectToNewSearchParams(newParams: Record<string, any>) {
    if (typeof window === undefined || !window.URL) return;
    const url = setQueryToCurrentUrl(newParams);
    if (window.location.search !== url.search) {
      window.history.replaceState({}, '', url.toString());
    }
    if (urlSearchParams.toString() !== url.searchParams.toString()) {
      forceUpdate({});
    }
  }

  useEffect(() => {
    if (typeof window === undefined || !window.URL) return;
    redirectToNewSearchParams({
      ...initial,
      ...params,
    });
  }, [params]);

  const setParams = (newParams: any) => {
    redirectToNewSearchParams(newParams);
  };

  useEffect(() => {
    if (typeof window === undefined || !window.URL) return () => {};

    const onPopState = () => {
      forceUpdate({});
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

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
