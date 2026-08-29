declare function Module(metadata: unknown): ClassDecorator;
declare const AlphaModule: unknown;
declare const AlphaService: unknown;
declare const ZuluModule: unknown;
declare const ZuluService: unknown;

@Module({
	imports: [ZuluModule, AlphaModule],
	providers: [ZuluService, AlphaService],
})
class AppModule {}

export { AppModule };
