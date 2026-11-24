import { MOCO_IMAGES } from '../../data/mocoImages.ts';

export function AboutSection() {
  return (
    <section id="about" className="py-16 sm:py-24 scroll-mt-20">
      <div className="max-w-[1140px] mx-auto px-5 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-3xl bg-[#f7edda] border border-[#ebe0cc] aspect-[4/3]">
              <img
                src={MOCO_IMAGES.about}
                alt="Mochi lembut Moco bergaya Japanese dessert"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-6">
            <p className="text-[12px] font-semibold tracking-[0.14em] text-[#9c7426]">
              About Moco
            </p>
            <h2 className="mt-2 font-display text-[32px] sm:text-[42px] font-bold leading-[1.12] tracking-[-0.02em] text-[#523925]">
              Sweet moments start with soft Japanese mochi.
            </h2>
            <p className="mt-5 text-[15px] leading-[1.85] text-[#766450]">
              Moco – Mochi Dessert Store menghadirkan mochi lembut dengan pilihan rasa buah segar,
              cream yang ringan, hingga cita rasa autentik Jepang seperti Matcha dan Red Bean.
            </p>
            <p className="mt-3.5 text-[15px] leading-[1.85] text-[#766450]">
              Cocok untuk teman santai di sela aktivitas, bingkisan manis untuk teman, atau camilan
              ringan dengan pemesanan langsung yang praktis melalui WhatsApp.
            </p>

            <div className="mt-8 pt-6 border-t border-[#ebe0cc] grid grid-cols-3 gap-4">
              <div>
                <p className="font-display text-[22px] font-bold text-[#523925] tabular-nums">5</p>
                <p className="text-[12px] text-[#766450] mt-0.5">Pilihan Rasa</p>
              </div>
              <div>
                <p className="font-display text-[22px] font-bold text-[#523925] tabular-nums">
                  Rp10rb
                </p>
                <p className="text-[12px] text-[#766450] mt-0.5">Harga Ramah</p>
              </div>
              <div>
                <p className="font-display text-[22px] font-bold text-[#523925]">Direct</p>
                <p className="text-[12px] text-[#766450] mt-0.5">Order WhatsApp</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
