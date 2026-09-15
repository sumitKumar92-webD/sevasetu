"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useTranslation,
} from "react-i18next";

import {
  SERVICES,
  serviceLabel,
} from "@/lib/services";

import {
  get,
} from "@/lib/api";

import {
  Stars,
} from "@/components/ui";

export default function HomePage() {
  const {
    t,
    i18n,
  } = useTranslation();

  const [
    workers,
    setWorkers,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    workerError,
    setWorkerError,
  ] = useState("");

  const currentLanguage =
    i18n.resolvedLanguage ||
    i18n.language ||
    "en";

  useEffect(() => {
    let componentMounted = true;

    const loadWorkers =
      async () => {
        setLoading(true);
        setWorkerError("");

        try {
          const data =
            await get(
              "/api/workers?sort=rating"
            );

          if (
            componentMounted
          ) {
            setWorkers(
              data.workers ||
                []
            );
          }
        } catch (error) {
          console.error(
            "Homepage workers error:",
            error
          );

          if (
            componentMounted
          ) {
            setWorkers([]);

            setWorkerError(
              error.message ||
                "Workers could not be loaded."
            );
          }
        } finally {
          if (
            componentMounted
          ) {
            setLoading(false);
          }
        }
      };

    loadWorkers();

    return () => {
      componentMounted =
        false;
    };
  }, []);

  const averageRating =
    useMemo(() => {
      if (
        workers.length === 0
      ) {
        return "—";
      }

      const ratingTotal =
        workers.reduce(
          (
            total,
            worker
          ) => {
            return (
              total +
              Number(
                worker.rating ||
                  0
              )
            );
          },
          0
        );

      return (
        ratingTotal /
        workers.length
      ).toFixed(1);
    }, [workers]);

  const topWorkers =
    useMemo(() => {
      return [...workers]
        .sort(
          (
            firstWorker,
            secondWorker
          ) =>
            Number(
              secondWorker.rating ||
                0
            ) -
            Number(
              firstWorker.rating ||
                0
            )
        )
        .slice(0, 4);
    }, [workers]);

  return (
    <div className="space-y-12">
      {/* Hero section */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-teal-800 via-teal-600 to-emerald-500 px-6 py-10 text-white shadow-lg md:px-10 md:py-14">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-5">
            <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              🇮🇳{" "}
              {t(
                "app.tagline"
              )}
            </span>

            <h1 className="max-w-xl text-3xl font-extrabold leading-tight md:text-5xl">
              {t(
                "home.heroTitle"
              )}
            </h1>

            <p className="max-w-xl text-sm leading-6 text-teal-50 md:text-base">
              {t(
                "home.heroText"
              )}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/book"
                className="btn bg-white text-teal-800 hover:bg-teal-50"
              >
                ⚡{" "}
                {t(
                  "home.cta"
                )}
              </Link>

              <Link
                href="/workers"
                className="btn border border-white/40 bg-white/10 text-white hover:bg-white/20"
              >
                {t(
                  "home.browse"
                )}
              </Link>
            </div>

            <div className="flex flex-wrap gap-4 pt-2 text-xs text-teal-50">
              <span>
                ✅{" "}
                {t(
                  "home.verifiedFeature",
                  {
                    defaultValue:
                      "Verified workers",
                  }
                )}
              </span>

              <span>
                📍{" "}
                {t(
                  "home.trackingFeature",
                  {
                    defaultValue:
                      "Live tracking",
                  }
                )}
              </span>

              <span>
                🛡️{" "}
                {t(
                  "home.safeFeature",
                  {
                    defaultValue:
                      "Secure booking",
                  }
                )}
              </span>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-3 self-center">
            <Stat
              value={
                loading
                  ? "..."
                  : workers.length
              }
              label={t(
                "home.stat1"
              )}
            />

            <Stat
              value={
                SERVICES.length
              }
              label={t(
                "home.stat2"
              )}
            />

            <Stat
              value={
                loading
                  ? "..."
                  : averageRating
              }
              label={t(
                "home.stat3"
              )}
            />
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t(
                "home.popular"
              )}
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              {t(
                "home.popularDescription",
                {
                  defaultValue:
                    "Choose a trusted service professional near you.",
                }
              )}
            </p>
          </div>

          <Link
            href="/workers"
            className="text-sm font-semibold text-teal-700 hover:underline"
          >
            {t(
              "home.viewAll",
              {
                defaultValue:
                  "View all",
              }
            )}{" "}
            →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SERVICES.map(
            (service) => (
              <Link
                key={
                  service.key
                }
                href={`/book?service=${service.key}`}
                className="card group flex flex-col items-center gap-2 p-4 text-center transition duration-200 hover:-translate-y-1 hover:border-teal-300 hover:shadow-md"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-2xl transition group-hover:bg-teal-100">
                  {
                    service.icon
                  }
                </span>

                <span className="text-sm font-semibold text-gray-800">
                  {serviceLabel(
                    service.key,
                    currentLanguage
                  )}
                </span>

                <span className="text-xs text-gray-500">
                  ₹
                  {
                    service.base
                  }
                  /
                  {t(
                    "home.hour",
                    {
                      defaultValue:
                        "hr",
                    }
                  )}
                </span>
              </Link>
            )
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t("home.how")}
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            {t(
              "home.howDescription",
              {
                defaultValue:
                  "Book a verified professional in three simple steps.",
              }
            )}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <HowStep
            number="1"
            icon="🛠️"
            title={t(
              "home.step1"
            )}
            description={t(
              "home.step1d"
            )}
          />

          <HowStep
            number="2"
            icon="🤖"
            title={t(
              "home.step2"
            )}
            description={t(
              "home.step2d"
            )}
          />

          <HowStep
            number="3"
            icon="📍"
            title={t(
              "home.step3"
            )}
            description={t(
              "home.step3d"
            )}
          />
        </div>
      </section>

      {/* Top-rated workers */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              ⭐{" "}
              {t(
                "home.topRated",
                {
                  defaultValue:
                    "Top-rated professionals",
                }
              )}
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              {t(
                "home.topRatedDescription",
                {
                  defaultValue:
                    "Highly rated cooperative professionals near you.",
                }
              )}
            </p>
          </div>

          <Link
            href="/workers"
            className="text-sm font-semibold text-teal-700 hover:underline"
          >
            {t(
              "home.viewAll",
              {
                defaultValue:
                  "View all",
              }
            )}{" "}
            →
          </Link>
        </div>

        {workerError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            ⚠️{" "}
            {t(
              "home.workersError",
              {
                defaultValue:
                  "Workers could not be loaded. Please refresh the page.",
              }
            )}
          </div>
        )}

        {loading ? (
          <WorkerSkeleton />
        ) : topWorkers.length >
          0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {topWorkers.map(
              (worker) => (
                <article
                  key={
                    worker.id
                  }
                  className="card space-y-3 p-4 transition hover:border-teal-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">
                        {
                          worker.name
                        }
                      </p>

                      <p className="text-xs text-gray-500">
                        {serviceLabel(
                          worker.service,
                          currentLanguage
                        )}
                      </p>
                    </div>

                    {worker.verification ===
                      "approved" && (
                      <span
                        className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700"
                        title="Verified"
                      >
                        ✓{" "}
                        {t(
                          "worker.verified"
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <Stars
                      value={Number(
                        worker.rating ||
                          0
                      )}
                    />

                    <span className="text-xs font-semibold text-teal-700">
                      ₹
                      {
                        worker.pricePerHour
                      }
                      /
                      {t(
                        "home.hour",
                        {
                          defaultValue:
                            "hr",
                        }
                      )}
                    </span>
                  </div>

                  <Link
                    href={`/book?service=${worker.service}&worker=${worker.id}`}
                    className="btn btn-ghost w-full !py-2 text-xs"
                  >
                    {t(
                      "home.bookWorker",
                      {
                        defaultValue:
                          "Book worker",
                      }
                    )}
                  </Link>
                </article>
              )
            )}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-3xl">
              👷
            </p>

            <p className="mt-2 font-semibold text-gray-900">
              {t(
                "home.noWorkers",
                {
                  defaultValue:
                    "No workers available",
                }
              )}
            </p>

            <p className="mt-1 text-sm text-gray-600">
              {t(
                "home.noWorkersDescription",
                {
                  defaultValue:
                    "Please check again shortly.",
                }
              )}
            </p>
          </div>
        )}
      </section>

      {/* SIH cooperative section */}
      <section className="rounded-3xl border border-teal-200 bg-teal-50 px-6 py-8 md:px-10">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <span className="inline-flex rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold text-white">
              SIH26089
            </span>

            <h2 className="mt-3 text-2xl font-bold text-gray-900">
              {t(
                "home.cooperativeTitle",
                {
                  defaultValue:
                    "A worker-owned cooperative service platform",
                }
              )}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              {t(
                "home.cooperativeDescription",
                {
                  defaultValue:
                    "SevaSetu supports fair wages, verified skills, worker welfare and transparent service booking.",
                }
              )}
            </p>
          </div>

          <Link
            href="/workers"
            className="btn btn-primary"
          >
            {t(
              "home.exploreServices",
              {
                defaultValue:
                  "Explore services",
              }
            )}
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({
  value,
  label,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/15 p-4 text-center backdrop-blur">
      <p className="text-2xl font-extrabold md:text-3xl">
        {value}
      </p>

      <p className="mt-1 text-[10px] uppercase tracking-wide text-teal-50 md:text-xs">
        {label}
      </p>
    </div>
  );
}

function HowStep({
  number,
  icon,
  title,
  description,
}) {
  return (
    <article className="card relative space-y-3 overflow-hidden p-5">
      <span className="absolute right-4 top-3 text-5xl opacity-10">
        {icon}
      </span>

      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
        {number}
      </span>

      <h3 className="font-semibold text-gray-900">
        {title}
      </h3>

      <p className="text-sm leading-6 text-gray-600">
        {description}
      </p>
    </article>
  );
}

function WorkerSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map(
        (item) => (
          <div
            key={item}
            className="card animate-pulse space-y-3 p-4"
          >
            <div className="h-4 w-2/3 rounded bg-gray-200" />

            <div className="h-3 w-1/2 rounded bg-gray-200" />

            <div className="flex justify-between">
              <div className="h-3 w-20 rounded bg-gray-200" />

              <div className="h-3 w-16 rounded bg-gray-200" />
            </div>

            <div className="h-9 rounded-xl bg-gray-200" />
          </div>
        )
      )}
    </div>
  );
}