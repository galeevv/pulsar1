import Image from "next/image";

const items = [
  {
    description:
      "Пульсар возникает в результате гравитационного коллапса ядра массивной звезды во время вспышки сверхновой.",
    imageAlt: "Рождение пульсара",
    imageSrc: "/details/birth.gif",
    title: "Рождение",
  },
  {
    description:
      "Нейтронные звезды характеризуются экстремально высокой плотностью, сопоставимой с плотностью атомного ядра.",
    imageAlt: "Физические свойства пульсара",
    imageSrc: "/details/physics.gif",
    title: "Физика",
  },
  {
    description:
      "Пульсары излучают регулярные электромагнитные импульсы в различных диапазонах спектра.",
    imageAlt: "Наблюдаемые импульсы пульсара",
    imageSrc: "/details/observed.gif",
    title: "Наблюдаемое",
  },
];

export function LandingDetailsSection() {
  return (
    <section
      className="scroll-mt-24 pb-16 md:scroll-mt-28 md:pb-15"
      id="pulsar-details"
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-eyebrow">
            Что такое пульсар?
          </p>
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-[28px] md:text-h2">
              Происхождение и основные характеристики
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base md:text-lead">
              Краткое описание формирования.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.title}
              className="rounded-card border border-border bg-card/40 p-card md:p-card-md"
            >
              <div className="overflow-hidden rounded-hero border border-border bg-background/60">
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    alt={item.imageAlt}
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    src={item.imageSrc}
                    unoptimized
                  />
                </div>
              </div>

              <h3 className="mt-4 text-lg font-semibold tracking-tight sm:text-xl">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                {item.description}
              </p>
            </article>
          ))}
        </div>

        <div className="rounded-card border border-border bg-card/30 p-card md:p-card-md">
          <p className="text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8 md:text-lg">
            <span className="font-semibold text-foreground">Значимость:</span>{" "}
            стабильность периодов делает пульсары природными «точными часами»
            космоса.
          </p>
        </div>
      </div>
    </section>
  );
}
