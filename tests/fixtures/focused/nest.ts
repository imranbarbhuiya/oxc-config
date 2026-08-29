declare function Module(metadata: unknown): ClassDecorator;
declare const AlphaModule: unknown;
declare const AlphaService: unknown;
declare const MidModule: unknown;
declare const MidService: unknown;
declare const ZuluModule: unknown;
declare const ZuluService: unknown;

@Module({
	imports: [ZuluModule, MidModule, AlphaModule],
	providers: [ZuluService, MidService, AlphaService],
})
class AppModule {}

export { AppModule };
